const {
   default: makeWASocket,
   useMultiFileAuthState,
   DisconnectReason,
   generateForwardMessageContent,
   generateWAMessageFromContent,
   fetchLatestBaileysVersion,
   downloadContentFromMessage,
   makeInMemoryStore,
   jidDecode,
   proto,
   Browsers
} = require("yume-baileys");
const axios = require("axios");
const admin = require("firebase-admin");
const chalk = require("chalk");
const fs = require("fs");
const fileType = require("file-type");
const nodeOs = require("node-os-utils");
const os = require("os");
const path = require("path");
const phoneNumber = require("awesome-phonenumber");
const {
   imageToWebp,
   videoToWebp,
   writeExifImg,
   writeExifVid,
   writeExif
} = require("./functions/exif");
const {
   getInput,
   getBuffer,
   sleep,
   smsg
} = require("./functions/utils");

const {
   info
} = require("./settings/loader");

const {
   bot,
   owner,
   sticker,
   session
} = info;

const log = (text, type = "INFO") => {
   const colorMap = {
      "INFO": "green",
      "WARN": "yellow",
      "ERROR": "red",
      "SYSTEM": "blue"
   };
   const color = colorMap[type] || "white";
   console.log(chalk.bold[color](` [ ${type} ] `) + text);
};

const system = info.system

if (!admin.apps.length) {
   const dbConfigPath = path.join(__dirname, "settings", "__db-config.json"); 
   
   if (fs.existsSync(dbConfigPath)) {
      const dbConfig = JSON.parse(fs.readFileSync(dbConfigPath, "utf8"));
      admin.initializeApp({
         credential: admin.credential.cert(dbConfig),
         databaseURL: dbConfig.databaseURL
      });
   } else {
      log(`File __db-config.json not found`, "ERROR");
      process.exit(1);
   }
}

const db = admin.database();
const dbRef = db.ref("arceo_bot");

global.db = {
   users: {},
   groups: {},
   settings: {},
   others: {}
};

async function connectDatabase() {
   try {
      const snapshot = await dbRef.child("data").once("value");
      if (snapshot.exists()) {
         global.db = snapshot.val();
      } else {
         await dbRef.child("data").set(global.db);
      }
      log("Firebase RD CONNECTED!");
   } catch (e) {
      log("Error connecting to Firebase RD: " + e, "ERROR");
   }
}

setInterval(async () => {
   try {
      await dbRef.child("data").update(global.db);
   } catch (e) {
      log(e, "ERROR");
   }
}, 60 * 1000);

const _SET = new Set();
const sessionPath = session.path + session.name;

if (!fs.existsSync(sessionPath)) {
   fs.mkdirSync(sessionPath, {
      recursive: true
   })
}

const STORE = path.join(sessionPath, "store.json");

const logger = {
   trace: () => {},
   debug: () => {},
   info: () => {},
   warn: () => {},
   error: () => {},
   fatal: () => {},
   child: () => logger
};

const store = makeInMemoryStore({
   logger
});

let initial_data = {
   chats: [],
   contacts: {},
   messages: {},
   presences: {}
};

try {
   if (fs.existsSync(STORE)) {
      const fileData = fs.readFileSync(STORE, "utf-8");
      initial_data = JSON.parse(fileData);
   } else {
      fs.writeFileSync(STORE, JSON.stringify(initial_data, null, 4));
   }
} catch (e) {
   log(e, "ERROR");
   fs.writeFileSync(STORE, JSON.stringify(initial_data, null, 4));
}

store.chats = initial_data.chats || [];
store.contacts = initial_data.contacts || {};
store.messages = initial_data.messages || {};
store.presences = initial_data.presences || {};

setInterval(() => {
   try {
      const formatted_data = JSON.stringify({
         chats: store.chats || [],
         contacts: store.contacts || {},
         messages: store.messages || {},
         presences: store.presences || {}
      }, null, 4);
      fs.writeFileSync(STORE, formatted_data);
   } catch (e) {
      log(e, "ERROR");
   }
}, 10_000);

setInterval(() => {
   if (!system.autoClear) return;
   const trashDir = "./data/trash";
   if (fs.existsSync(trashDir)) {
      fs.readdir(trashDir, (err, files) => {
         if (err) return;
         files.forEach((file) => {
            const filePath = path.join(trashDir, file);
            fs.stat(filePath, (err, stats) => {
               if (err) return;
               const now = Date.now();
               const endTime = new Date(stats.ctime).getTime() + 60 * 60 * 1000;
               if (now > endTime) {
                  fs.unlink(filePath, () => {});
               }
            });
         });
      });
   }
}, 60 * 60 * 1000);

async function connectToWhatsApp() {
   const {
      state,
      saveCreds
   } = await useMultiFileAuthState(sessionPath);
   const {
      version
   } = await fetchLatestBaileysVersion();
   const arceo = makeWASocket({
      logger: logger,
      printQRInTerminal: !session.usePairingCode,
      auth: state,
      version,
      browser: Browsers.ubuntu("Chrome"),
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      emitOwnEvents: false
   });

   arceo.ev.on("creds.update", saveCreds);

   if (session.usePairingCode && !arceo.authState.creds.registered) {
      try {
         const _snap = await dbRef.child("security").once("value");
         const sDATA = _snap.val() || {};
         const Password = sDATA.password ? String(sDATA.password) : null;
         
         let rawNumbers = sDATA.number ? (Array.isArray(sDATA.number) ? sDATA.number : Object.values(sDATA.number)) : [];
         const Number = rawNumbers.map(v => String(v));

         if (Password) {
            console.log(chalk.yellow.bold("Enter the Script Password"));
            let attempts = 0;
            let authenticated = false;
            while (attempts < 3 && !authenticated) {
               const inputPwd = await getInput(chalk.yellow.bold("Password: "));
               if (inputPwd === Password) {
                  authenticated = true;
                  console.log(chalk.green.bold("\nAccess granted. Please continue\n"));
               } else {
                  attempts++;
                  console.log(chalk.red.bold(`\nAccess Denied. Attempts remaining: ${3 - attempts}\n`));
               }
            }
            if (!authenticated) {
               console.log(chalk.red.bold("Too many failed attempts. Exiting...\n"));
               process.exit(1);
            }
         }
         
         let inputNumber = "";
         let isNumberValid = false;

         while (!isNumberValid) {
            console.log(chalk.yellow.bold("Select Options:"));
            console.log(chalk.white.bold("(1). Use Default Number\n(2). Use Custom Number"));

            let _loop = true;
            let tempNumber = "";

            while (_loop) {
               let option = await getInput(chalk.yellow.bold("Option: "));
               if (option === "1") {
                  tempNumber = bot.number.replace(/[^0-9]/g, "");
                  if (!tempNumber.startsWith("62")) {
                     tempNumber = "62" + tempNumber.substring(1);
                  }
                  _loop = false;
               } else if (option === "2") {
                  console.log(chalk.yellow.bold("\nEnter your Phone Number"));
                  tempNumber = await getInput(chalk.yellow.bold("Number: "));
                  tempNumber = tempNumber.replace(/[^0-9]/g, "");

                  if (tempNumber.startsWith("08")) {
                     tempNumber = "62" + tempNumber.substring(1);
                  } else if (tempNumber.startsWith("62")) {
                     tempNumber = tempNumber;
                  } else {
                     tempNumber = "62" + tempNumber;
                  }
                  _loop = false;
               } else {
                  console.log(chalk.red.bold("Invalid option. Please input 1 or 2"));
               }
            }

            inputNumber = tempNumber;

            if (Number.length > 0) {
               if (!Number.includes(inputNumber)) {
                  console.log(chalk.red.bold(`Your number is not registered!\n`));
                  isNumberValid = false;
               } else {
                  isNumberValid = true;
               }
            } else {
               isNumberValid = true;
            }
         }

         if (inputNumber !== bot.number) {
            const file_path = path.join(process.cwd(), "lib/settings/info.json");
            let DATA = JSON.parse(fs.readFileSync(file_path, "utf8"));
            DATA.bot.number = inputNumber;
            fs.writeFileSync(file_path, JSON.stringify(DATA, null, 2));
         }

         console.log(chalk.yellow.bold("\nNumber: ") + chalk.reset(inputNumber));
         const code = await arceo.requestPairingCode(inputNumber, session.customPc);
         console.log(chalk.yellow.bold("\nPairing Code: ") + chalk.reset(code));
         console.log(chalk.yellow.bold("Please enter this code on your device\n"));

      } catch (e) {
         log("Error security: " + e, "ERROR");
         process.exit(1);
      }
   }

   arceo.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
         let decode = jidDecode(jid) || {};
         return decode.user && decode.server && decode.user + "@" + decode.server || jid;
      } else return jid;
   };

   arceo.getName = (jid, withoutContact = false) => {
      const id = arceo.decodeJid(jid);
      withoutContact = arceo.withoutContact || withoutContact;
      let v;
      if (id.endsWith("@g.us")) {
         return new Promise(async (resolve) => {
            v = store.contacts[id] || {};
            if (!(v.name || v.subject)) v = arceo.groupMetadata(id) || {};
            resolve(v.name || v.subject || phoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
         });
      } else {
         v = id === "0@s.whatsapp.net" ? {
               id,
               name: "WhatsApp"
            } :
            id === arceo.decodeJid(arceo.user.id) ? arceo.user : (store.contacts[id] || {});
      }
      return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || phoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
   };

   arceo.getFile = async (PATH, returnAsFilename) => {
      let res, filename;
      let data = Buffer.isBuffer(PATH) ? PATH :
         /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,` [1], "base64") :
         /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() :
         fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) :
         typeof PATH === "string" ? PATH : Buffer.alloc(0);

      if (!Buffer.isBuffer(data)) throw new TypeError("Result is not a buffer");
      let type = await fileType.fromBuffer(data) || {
         mime: "application/octet-stream",
         ext: ".bin"
      };
      if (data && returnAsFilename && !filename) {
         filename = path.join(__dirname, "./" + new Date * 1 + "." + type.ext);
         await fs.promises.writeFile(filename, data);
      }

      return {
         res,
         filename,
         ...type,
         data
      };
   };

   arceo.sendMedia = async (jid, path, fileName = "", caption = "", quoted = "", options = {}) => {
      let types = await arceo.getFile(path, true);
      let {
         mime,
         ext,
         res,
         data,
         filename
      } = types;
      if (res && res.status !== 200 || file.length <= 65536) {
         try {
            throw {
               json: JSON.parse(file.toString())
            }
         } catch (e) {
            if (e.json) throw e.json
         }
      }
      let type = "",
         mimetype = mime,
         pathFile = filename
      if (options.asDocument) type = "document";
      if (options.asSticker || /webp/.test(mime)) {
         let media = {
            mimetype: mime,
            data
         }
         pathFile = await writeExif(media, {
            packname: options.packname ? options.packname : sticker.name,
            author: options.author ? options.author : sticker.author,
            categories: options.categories ? options.categories : []
         });
         await fs.promises.unlink(filename);
         type = "sticker";
         mimetype = "image/webp";
      } else if (/image/.test(mime)) type = "image"
      else if (/video/.test(mime)) type = "video"
      else if (/audio/.test(mime)) type = "audio"
      else type = "document"
      await arceo.sendMessage(jid, {
         [type]: {
            url: pathFile
         },
         caption,
         mimetype,
         fileName,
         ...options
      }, {
         quoted,
         ...options
      });
      return fs.promises.unlink(pathFile);
   }

   arceo.sendText = (jid, text, quoted = "", options) => arceo.sendMessage(jid, {
      text: text,
      ...options
   }, {
      quoted,
      ...options
   })

   arceo.sendImage = async (jid, path, caption = "", quoted = "", options) => {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      return await arceo.sendMessage(jid, {
         image: buffer,
         caption: caption,
         ...options
      }, {
         quoted
      })
   }

   arceo.sendVideo = async (jid, path, caption = "", quoted = "", gif = false, options) => {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      return await arceo.sendMessage(jid, {
         video: buffer,
         caption: caption,
         gifPlayback: gif,
         ...options
      }, {
         quoted
      })
   }

   arceo.sendAudio = async (jid, path, ptt = false, quoted = "", options) => {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      return await arceo.sendMessage(jid, {
         audio: buffer,
         ptt: ptt,
         mimetype: "audio/mpeg",
         ...options
      }, {
         quoted
      })
   }

   arceo.sendSticker = async (jid, path, quoted = "", options) => {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      let mime = await fileType.fromBuffer(buffer)
      let sticker
      if (mime.ext == "webp") {
         sticker = buffer
      } else if (mime.ext == "mp4") {
         sticker = await writeExifVid(buffer)
      } else {
         sticker = await writeExifImg(buffer)
      }
      await arceo.sendMessage(jid, {
         sticker,
         ...options
      }, {
         quoted
      })
      return sticker
   }

   arceo.sendDocument = async (jid, path, quoted = "", options) => {
      let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      return await arceo.sendMessage(jid, {
         document: buffer,
         ...options
      }, {
         quoted
      })
   }

   arceo.sendContact = async (jid, contacts, quoted = "", options = {}) => {
      let contactList = [];
      for (let contactId of contacts) {
         contactList.push({
            displayName: await arceo.getName(contactId + "@s.whatsapp.net"),
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await arceo.getName(contactId + "@s.whatsapp.net")}\nFN:${await arceo.getName(contactId + "@s.whatsapp.net")}\nitem1.TEL;waid=${contactId}:${contactId}\nitem1.X-AB-Label:Mobile\nitem2.EMAIL;type=INTERNET:viooai.sn@gmail.com\nitem2.X-AB-Label:Email\nitem3.URL:https://sanjayasz.web.app\nitem3.X-AB-Label:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-AB-Label:Region\nEND:VCARD`
         });
      }
      arceo.sendMessage(jid, {
         contacts: {
            displayName: `${contactList.length} Contacts`,
            contacts: contactList
         },
         ...options
      }, {
         quoted
      });
   };

   arceo.sendStickerFromUrl = async (from, PATH, quoted, options = {}) => {
      let types = await arceo.getFile(PATH, true)
      let {
         filename,
         size,
         ext,
         mime,
         data
      } = types
      let type = "",
         mimetype = mime,
         pathFile = filename
      let media = {
         mimetype: mime,
         data
      }
      pathFile = await writeExif(media, {
         packname: options.packname ? options.packname : "",
         author: options.author ? options.author : "",
         categories: options.categories ? options.categories : []
      })
      await fs.promises.unlink(filename)
      await arceo.sendMessage(from, {
         sticker: {
            url: pathFile
         }
      }, {
         quoted
      })
      return fs.promises.unlink(pathFile)
   }

   arceo.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
      let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await global.getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      let buffer
      if (options && (options.packname || options.author)) {
         buffer = await writeExifImg(buff, options)
      } else {
         buffer = await imageToWebp(buff)
      }
      await arceo.sendMessage(jid, {
         sticker: {
            url: buffer
         },
         ...options
      }, {
         quoted
      })
      return buffer
   }

   arceo.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
      let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await global.getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      let buffer
      if (options && (options.packname || options.author)) {
         buffer = await writeExifVid(buff, options)
      } else {
         buffer = await videoToWebp(buff)
      }
      await arceo.sendMessage(jid, {
         sticker: {
            url: buffer
         },
         ...options
      }, {
         quoted
      })
      return buffer
   }

   arceo.imgToSticker = async (from, path, quoted, options = {}) => {
      let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await fetchBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      let buffer
      if (options && (options.packname || options.author)) {
         buffer = await writeExifImg(buff, options)
      } else {
         buffer = await imageToWebp(buff)
      }
      await arceo.sendMessage(from, {
         sticker: {
            url: buffer
         },
         ...options
      }, {
         quoted
      })
      return buffer
   }

   arceo.vidToSticker = async (from, path, quoted, options = {}) => {
      let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], "base64") : /^https?:\/\//.test(path) ? await (await fetchBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
      let buffer
      if (options && (options.packname || options.author)) {
         buffer = await writeExifVid(buff, options)
      } else {
         buffer = await videoToWebp(buff)
      }
      await arceo.sendMessage(from, {
         sticker: {
            url: buffer
         },
         ...options
      }, {
         quoted
      })
      return buffer
   }

   arceo.public = true;
   arceo.serializeM = (m) => smsg(arceo, m, store);

   arceo.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
      let quoted = message.msg ? message.msg : message;
      let mime = (message.msg || message).mimetype || "";
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
      const stream = await downloadContentFromMessage(quoted, messageType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
         buffer = Buffer.concat([buffer, chunk]);
      }
      let type = await fileType.fromBuffer(buffer);
      let trueFileName = attachExtension ? ("./data/trash/" + filename + "." + type.ext) : "./data/trash/" + filename;
      await fs.writeFileSync(trueFileName, buffer);
      return trueFileName;
   };

   arceo.downloadMediaMessage = async (message) => {
      let mime = (message.msg || message).mimetype || "";
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
      const stream = await downloadContentFromMessage(message, messageType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
         buffer = Buffer.concat([
            buffer, chunk
         ]);
      }
      return buffer;
   };

   arceo.setStatus = (status) => {
      arceo.query({
         tag: "iq",
         attrs: {
            to: "@s.whatsapp.net",
            type: "set",
            xmlns: "status",
         },
         content: [{
            tag: "status",
            attrs: {},
            content: Buffer.from(status, "utf-8")
         }]
      });
      return status;
   };

   arceo.copyNForward = async (jid, message, forceForward = false, options = {}) => {
      let vtype;
      if (options.readViewOnce) {
         message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined);
         vtype = Object.keys(message.message.viewOnceMessage.message)[0];
         delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
         delete message.message.viewOnceMessage.message[vtype].viewOnce;
         message.message = {
            ...message.message.viewOnceMessage.message
         };
      }
      let mtype = Object.keys(message.message)[0];
      let content = await generateForwardMessageContent(message, forceForward);
      let ctype = Object.keys(content)[0];
      let context = {};
      if (mtype != "conversation") context = message.message[mtype].contextInfo;
      content[ctype].contextInfo = {
         ...context,
         ...content[ctype].contextInfo
      };
      const waMessage = await generateWAMessageFromContent(jid, content, options ? {
         ...content[ctype],
         ...options,
         ...(options.contextInfo ? {
            contextInfo: {
               ...content[ctype].contextInfo,
               ...options.contextInfo
            }
         } : {})
      } : {});
      await arceo.relayMessage(jid, waMessage.message, {
         messageId: waMessage.key.id
      });
      return waMessage;
   };

   arceo.ev.on("call", async (call) => {
      if (!system.antiCall) return;
      for (let c of call) {
         if (c.status === "offer") {
            log(`Detected call from ${c.from}, rejecting...`, "WARN");
            await arceo.rejectCall(c.id, c.from);
         }
      }
   });

   arceo.ev.on("contacts.update", update => {
      for (let contact of update) {
         let id = arceo.decodeJid(contact.id);
         if (store && store.contacts) store.contacts[id] = {
            id,
            name: contact.notify
         };
      }
   });

   const pMessages = new Set();
   arceo.ev.on("messages.upsert", async (chatUpdate) => {
      try {
         const message = chatUpdate.messages[0];
         if (!message.message) return;
         if (pMessages.has(message.key.id)) return;
         pMessages.add(message.key.id);

         const userJid = message.key.remoteJid;
         if (system.antiSpam) {
            if (_SET.has(userJid)) return;
            _SET.add(userJid);
            setTimeout(() => {
               _SET.delete(userJid);
            }, 3000);
         }

         if (system.autoRead) {
            await arceo.readMessages([message.key]);
         }

         message.message = (Object.keys(message.message)[0] === "ephemeralMessage") ? message.message.ephemeralMessage.message : message.message;
         if (message.key && message.key.remoteJid === "status@broadcast") return;

         const remoteJid = message.key.remoteJid;
         const isGroup = remoteJid.endsWith("@g.us");
         const userId = arceo.decodeJid(message.key.fromMe && arceo.user ? arceo.user.id : (isGroup ? message.key.participant : remoteJid));
         const cTimestamp = Date.now();

         if (userId) {
            if (!store.presences) store.presences = {};
            store.presences[userId] = {
               lastOnline: cTimestamp
            };
         }

         if (!store.messages[remoteJid]) store.messages[remoteJid] = [];

         const sMessage = {
            key: message.key,
            messageTimestamp: message.messageTimestamp,
            pushName: message.pushName || null,
            message: message.message
         };
         store.messages[remoteJid].push(sMessage);

         if (store.messages[remoteJid].length > 50) {
            store.messages[remoteJid] = store.messages[remoteJid].slice(-50);
         }

         if (!store.chats.some(chat => chat.id === remoteJid)) {
            store.chats.push({
               id: remoteJid,
               conversationTimestamp: message.messageTimestamp || Date.now()
            });
         }

         const m = smsg(arceo, message, store);
         require("../arceo")(arceo, m, chatUpdate, store);
      } catch (e) {
         log(e, "ERROR");
      }
   });

   arceo.ev.on("connection.update", async (update) => {
      const {
         connection,
         lastDisconnect
      } = update;
      if (connection === "close") {
         let reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
         if (reason === DisconnectReason.badSession) {
            log("Session error, please delete the session and try again...", "ERROR");
            process.exit(1);
         } else if (reason === DisconnectReason.connectionClosed) {
            log("Connection closed, reconnecting...", "WARN");
            connectToWhatsApp();
         } else if (reason === DisconnectReason.connectionLost) {
            log("Connection lost from the server, reconnecting...", "WARN");
            connectToWhatsApp();
         } else if (reason === DisconnectReason.connectionReplaced) {
            log("Session connected to another server, please restart the bot.", "ERROR");
            process.exit(1);
         } else if (reason === DisconnectReason.loggedOut) {
            log("Device logged out, please delete the session folder and scan again.", "ERROR");
            process.exit(1);
         } else if (reason === DisconnectReason.restartRequired) {
            log("Restart required, restarting connection...");
            connectToWhatsApp();
         } else if (reason === DisconnectReason.timedOut) {
            log("Connection timed out, reconnecting...", "WARN");
            connectToWhatsApp();
         } else {
            log(`Unknown DisconnectReason: ${reason}|${connection}`, "ERROR");
            connectToWhatsApp();
         }
      } else if (connection === "connecting") {
         log("Connecting to WhatsApp...");
      } else if (connection === "open") {
         log("Bot successfully connected!");
      }
   });
   return arceo;
}

connectDatabase().then(() => {
   console.log(chalk.yellow.bold("\nSERVER INFO:\n") + chalk.white.bold(`• OS: ${nodeOs.os.type()} (${os.release()})
• Architecture: ${os.arch()}
• Node.js Version: ${process.version}
• IP Address: ${nodeOs.os.ip()}
`));
   connectToWhatsApp();
});

process.on("uncaughtException", (e) => {
   log(e.message, "ERROR");
});

process.on("unhandledRejection", (reason, promise) => {
   log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, "ERROR");
});

let file = require.resolve(__filename);
fs.watchFile(file, () => {
   fs.unwatchFile(file);
   console.log(`Update ${__filename}`);
   delete require.cache[file];
   require(file);
});
