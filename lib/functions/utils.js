import {
   proto,
   getContentType,
   generateWAMessage,
   areJidsSameUser
} from "@whiskeysockets/baileys";
import chalk from "chalk";
import fs from "fs";
import os from "os";
import readline from "readline";

const Log = (text, type = "INFO", options = {}) => {
   try {
      const {
         top = false, bottom = false
      } = options;

      if (top) {
         for (let i = 0; i < 1; i++) {
            console.log("ㅤ");
         }
      }

    const colorMap = {
       "INFO": "green",
       "WARN": "yellow",
       "ERROR": "red",
       "SYSTEM": "blue"
    };
    const color = colorMap[type] || "white";
    console.log(chalk[color].bold(` [ ${type} ] `) + text);

      if (bottom) {
         for (let i = 0; i < 1; i++) {
            console.log("ㅤ");
         }
      }
   } catch (e) {
      console.log(`[ ${type} ] ${text}`);
   }
};

const Enc = (message) => {
   try {
      return encodeURIComponent(message);
   } catch (e) {
      throw new Error({ e });
   }
};

const formatIDR = (number) => {
   try {
      let formattedAmount = "";
      const reversedNumber = number.toString().split("").reverse().join("");
      for (let i = 0; i < reversedNumber.length; i++) {
         if (i % 3 == 0) formattedAmount += reversedNumber.substr(i, 3) + ".";
      }
      return "" + formattedAmount.split("", formattedAmount.length - 1).reverse().join("");
   } catch (e) {
      throw new Error({ e });
   }
};

const formatUSD = (number) => {
   try {
      const exchangeRate = 15000;
      const usdAmount = number / exchangeRate;
      const formattedAmount = usdAmount.toFixed(2);
      const parts = formattedAmount.split(".");
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return "$" + integerPart + "." + parts[1];
   } catch (e) {
      throw new Error({ e });
   }
};

const fetchJson = async (url, options) => {
   try {
      const res = await fetch(url, {
         method: "GET",
         ...options
      });
      return await res.json();
   } catch (e) {
      throw new Error({ e });
   }
};

const formatBytes = (bytes) => {
   try {
      const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
      let i = 0;
      while (bytes >= 1024 && i < units.length - 1) {
         bytes /= 1024;
         i++;
      }
      return `${bytes.toFixed(1)} ${units[i]}`;
   } catch (e) {
      throw new Error({ e });
   }
};

const getInput = async (message) => {
   try {
      const rl = readline.createInterface({
         input: process.stdin,
         output: process.stdout
      });
      return new Promise(resolve => rl.question(message, answer => {
         rl.close();
         resolve(answer.trim());
      }));
   } catch (e) {
      throw new Error({ e });
   }
};

const getBuffer = async (url, options) => {
   try {
      const res = await fetch(url, {
         method: "GET",
         headers: {
            "DNT": "1",
            "Upgrade-Insecure-Request": "1"
         },
         ...options
      });
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
   } catch (e) {
      throw new Error({ e });
   }
};

const getLocalIp = () => {
   try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
         for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
               return iface.address;
            }
         }
      }
      return '127.0.0.1';
   } catch (e) {
      throw new Error({ e });
   }
};

const getTypeMessage = (message) => {
   try {
      const type = Object.keys(message);
      var restype = (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) ||
         (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) ||
         type[type.length - 1] || Object.keys(message)[0];
      return restype;
   } catch (e) {
      throw new Error({ e });
   }
};

const parseTime = (string) => {
   try {
      if (typeof string === 'number') return string;
      const match = string.match(/^(\d+)([smhdw])$/);
      if (!match) return 1000;
      const val = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
         case 's': return val * 1000;
         case 'm': return val * 60000;
         case 'h': return val * 3600000;
         case 'd': return val * 86400000;
         case 'w': return val * 604800000;
         default: return val;
      }
   } catch (e) {
      throw new Error({ e });
   }
};

const randomCharacter = (amount) => {
   try {
      const letter = "abcdefghijklmnopqrstuvwxyz";
      let results = "";
      for (let i = 0; i < amount; i++) {
         const randomIndex = Math.floor(Math.random() * letter.length);
         let randomLetters = letter[randomIndex];
         randomLetters = Math.random() < 0.5 ? randomLetters.toUpperCase() : randomLetters;
         results += randomLetters;
      }
      return results;
   } catch (e) {
      throw new Error({ e });
   }
};

const randomNumber = (min, max = null) => {
   try {
      if (max !== null) {
         min = Math.ceil(min);
         max = Math.floor(max);
         return Math.floor(Math.random() * (max - min + 1)) + min;
      } else {
         return Math.floor(Math.random() * min) + 1;
      }
   } catch (e) {
      throw new Error({ e });
   }
};

const runtime = (seconds) => {
   try {
      seconds = Number(seconds);
      const d = Math.floor(seconds / (3600 * 24));
      const h = Math.floor(seconds % (3600 * 24) / 3600);
      const m = Math.floor(seconds % 3600 / 60);

      const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
      const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
      const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";

      return dDisplay + hDisplay + mDisplay;
   } catch (e) {
      throw new Error({ e });
   }
};

const sleep = async (ms) => {
   try {
      return new Promise(resolve => setTimeout(resolve, ms));
   } catch (e) {
      throw new Error({ e });
   }
};

const smsg = (sock, m, store) => {
   try {
      if (!m) {
         return m;
      }

      let M = proto.WebMessageInfo;
      var m = M.fromObject(m);

      if (m.key) {
         m.id = m.key.id;
         m.isBaileys = [6, 16, 20, 22, 40].includes(m.id.length);
         m.chat = m.key.remoteJid;
         m.fromMe = m.key.fromMe;
         m.isGroup = m.chat.endsWith("@g.us");
         m.sender = sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || "");

         if (m.isGroup) {
            m.participant = sock.decodeJid(m.key.participant) || "";
         }
      }

      if (m.message) {
         m.mtype = getTypeMessage(m.message);
         m.msg = (m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getTypeMessage(m.message[m.mtype].message)] : m.message[m.mtype]);

         m.body = (m.mtype === "interactiveResponseMessage") ?
            JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id :
            m.message?.conversation ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.extendedTextMessage?.text ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.templateButtonReplyMessage?.selectedId ||
            m.message?.messageContextInfo?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.messageContextInfo?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            (m.mtype === "viewOnceMessageV2" && (m.msg.message?.imageMessage?.caption || m.msg.message?.videoMessage?.caption)) || "";

         m.fileName = (m.mtype === "documentMessage" && m.msg.fileName) || (m.mtype === "audioMessage" && m.msg.fileName) || null;
         m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];

         if (m.mtype == "viewOnceMessageV2" || m.msg.url) {
            m.download = () => sock.downloadMediaMessage(m);
         }

         m.copy = () => smsg(sock, M.fromObject(M.toObject(m)), store);
         m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => sock.copyNForward(jid, m, forceForward, options);
         m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? sock.sendMedia(chatId, text, "file", "", m, {
            ...options
         }) : sock.sendText(chatId, text, m, {
            ...options
         });

         let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;

         if (m.quoted) {
            let type = Object.keys(quoted)[0];
            m.quoted = m.quoted[type];

            if (["productMessage"].includes(type)) {
               type = getContentType(m.quoted);
               m.quoted = m.quoted[type];
            }

            if (typeof m.quoted === "string") {
               m.quoted = {
                  text: m.quoted
               };
            }

            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? [6, 16, 20, 22, 40].includes(m.quoted.id.length) : false;

            m.quoted.sender = sock.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === (sock.user && sock.user.jid);
            m.quoted.text = m.quoted.text ||
               m.quoted.caption ||
               m.quoted.conversation ||
               m.quoted.contentText ||
               m.quoted.selectedDisplayText ||
               m.quoted.title ||
               m.quoted.name ||
               m.quoted.body?.text ||
               m.quoted.message?.imageMessage?.caption ||
               m.quoted.message?.videoMessage?.caption ||
               "";

            m.quoted.fileName = (m.quoted.mtype === "documentMessage" && m.quoted.fileName) || (m.quoted.mtype === "audioMessage" && m.quoted.fileName) || null;
            m.quoted.mentionedJid = m.quoted.contextInfo ? m.quoted.contextInfo.mentionedJid : [];

            let vM = m.quoted.fakeObj = M.fromObject({
               key: {
                  remoteJid: m.quoted.chat,
                  fromMe: m.quoted.fromMe,
                  id: m.quoted.id
               },
               message: quoted,
               ...(m.isGroup ? {
                  participant: m.quoted.sender
               } : {})
            });

            m.quoted.download = () => sock.downloadMediaMessage(m.quoted);
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => sock.copyNForward(jid, vM, forceForward, options);
            m.quoted.delete = () => sock.sendMessage(m.quoted.chat, {
               delete: vM.key
            });

            m.getQuotedObj = m.getQuotedMessage = async () => {
               if (!m.quoted.id) {
                  return false;
               }
               let q = await store.loadMessage(m.chat, m.quoted.id, sock);
               return smsg(sock, q, store);
            };
         }
      }

      m.name = sock.getName(m.sender);
      m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.body || "";

      sock.appenTextMessage = async (text, chatUpdate) => {
         let messages = await generateWAMessage(m.chat, {
            text: text,
            mentions: m.mentionedJid
         }, {
            userJid: sock.user.id,
            quoted: m.quoted && m.quoted.fakeObj
         });
         messages.key.fromMe = areJidsSameUser(m.sender, sock.user.id);
         messages.key.id = m.key.id;
         messages.pushName = m.pushName;
         if (m.isGroup) messages.participant = m.sender;
         let msg = {
            ...chatUpdate,
            messages: [proto.WebMessageInfo.fromObject(messages)],
            type: "append"
         };
         sock.ev.emit("messages.upsert", msg);
      };

      return m;
   } catch (e) {
      throw new Error({ e });
   }
};

export {
   Log,
   Enc,
   formatIDR,
   formatUSD,
   fetchJson,
   formatBytes,
   getInput,
   getBuffer,
   getLocalIp,
   getTypeMessage,
   parseTime,
   randomCharacter,
   randomNumber,
   runtime,
   sleep,
   smsg
};