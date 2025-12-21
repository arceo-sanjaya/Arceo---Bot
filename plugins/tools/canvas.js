import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import fs from "fs";
import util from "util";

import { config } from "../../lib/settings/loader.js";
import { Enc, getBuffer } from "../../lib/functions/utils.js";

const { sticker } = config;

export default {
   brat: {
      usage: ["brat"],
      async: async (m, { text, prefix, command, sock }) => {
         if (!text) return m.reply(`Wrong way of using it!\n\nExample: ${prefix + command} hello`);
         if (text.length > 250) return m.reply("Limited characters, maximum 250 characters!");
         try {
            let res = await fetch(`https://skyzxu-brat.hf.space/brat?text=${Enc(text)}`);
            let buf = Buffer.from(await res.arrayBuffer());
            await sock.sendImageAsSticker(m.chat, buf, m, { packname: "", author: sticker.author });
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   bratvideo: {
      usage: ["bratvideo"],
      async: async (m, { text, prefix, command, sock }) => {
         if (!text) return m.reply(`Wrong way of using it!\n\nExample: ${prefix + command} hello`);
         if (text.length > 250) return m.reply("Limited characters, maximum 250 characters!");
         try {
            let res = await fetch(`https://skyzxu-brat.hf.space/brat-animated?text=${Enc(text)}`);
            let buf = Buffer.from(await res.arrayBuffer());
            await sock.sendVideoAsSticker(m.chat, buf, m, { packname: "", author: sticker.author });
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   emojimix: {
      usage: ["emojimix"],
      async: async (m, { text, prefix, command, sock }) => {
         if (!text.includes("+")) return m.reply(`Wrong way of using it!\n\nExample: ${prefix + command} 😆+😂`);
         let [e1, e2] = text.split("+");
         if (!e1 || !e2) return m.reply(`Wrong way of using it!\n\nExample: ${prefix + command} 😆+😂`);
         try {
            let res = await fetch(`https://emojik.vercel.app/s/${e1.codePointAt(0).toString(16)}_${e2.codePointAt(0).toString(16)}?size=256`);
            let buf = Buffer.from(await res.arrayBuffer());
            await sock.sendImageAsSticker(m.chat, buf, m, { packname: "", author: sticker.author });
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   qc: {
      usage: ["qc", "qcsticker"],
      async: async (m, { args, prefix, command, sock }) => {
         if (!args[0]) return m.reply(`Wrong way of using it!\n\nExample 1: ${prefix + command} white hello\nExample 2: Reply to a message with ${prefix + command} white`);

         try {
            let clr = args[0].toLowerCase();
            let msg;

            if (m.quoted && m.quoted.text) msg = m.quoted.text;
            else msg = args.slice(1).join(" ");

            if (!msg) return m.reply(`Wrong way of using it!\n\nExample 1: ${prefix + command} white hello\nExample 2: Reply to a message with ${prefix + command} white`);
            if (msg.length > 100) return m.reply("Limited characters, maximum 100 characters!");

            const cmap = {
               pink: "#f68ac9", blue: "#6cace4", red: "#f44336", green: "#4caf50",
               yellow: "#ffeb3b", purple: "#9c27b0", darkblue: "#0d47a1", lightblue: "#03a9f4",
               orange: "#ff9800", black: "#000000", white: "#ffffff", teal: "#008080",
               lightpink: "#FFC0CB", magenta: "#FF00FF", skyblue: "#00BFFF", darkred: "#8B0000",
               orangered: "#FF4500", cyan: "#48D1CC", violet: "#BA55D3", darkgreen: "#008000",
               navyblue: "#191970", darkorange: "#FF8C00", darkpurple: "#9400D3", fuchsia: "#FF00FF",
               darkmagenta: "#8B008B", darkgray: "#2F4F4F", gold: "#FFD700", silver: "#C0C0C0"
            };

            const bg = cmap[clr];
            if (!bg) return m.reply("That color was not found!");

            const pp = await sock.profilePictureUrl(m.sender, "image").catch(() => "https://files.catbox.moe/nwvkbt.png");
            const obj = {
               type: "quote",
               format: "png",
               backgroundColor: bg,
               width: 512,
               height: 768,
               scale: 2,
               messages: [{
                  entities: [],
                  avatar: true,
                  from: { id: 1, name: m.pushName, photo: { url: pp } },
                  text: msg,
                  replyMessage: {}
               }]
            };
            const res = await fetch("https://bot.lyo.su/quote/generate", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(obj)
            });
            const json = await res.json();
            const buf = Buffer.from(json.result.image, "base64");
            await sock.sendImageAsSticker(m.chat, buf, m, { packname: "", author: sticker.author });
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   sticker: {
      usage: ["sticker", "stiker"],
      async: async (m, { prefix, command, sock, isQuoted, mime }) => {
         if (!isQuoted) return m.reply(`Send an image or reply to an image message with the caption ${prefix + command}`);
         try {
            if (isQuoted) {
               let q = isQuoted;
               let t = Object.keys(q)[0];
               if (q[t].viewOnce) {
                  let med = await downloadContentFromMessage(q[t], t == "imageMessage" ? "image" : "video");
                  let buf = Buffer.from([]);
                  for await (const chunk of med) { buf = Buffer.concat([buf, chunk]); }
                  if (/video/.test(t)) {
                     if ((isQuoted.msg || isQuoted).seconds > 8) return m.reply("Maximum 8 seconds!");
                     await sock.vidToSticker(m.chat, buf, m, { packname: "", author: sticker.author });
                     return;
                  } else if (/image/.test(t)) {
                     await sock.imgToSticker(m.chat, buf, m, { packname: "", author: sticker.author });
                     return;
                  }
               }
            }

            if (/image/.test(mime)) {
               let med = await sock.downloadAndSaveMediaMessage(isQuoted, + new Date * 1);
               await sock.imgToSticker(m.chat, med, m, { packname: "", author: sticker.author });
               fs.unlinkSync(med);
            } else if (/video/.test(mime)) {
               if ((isQuoted.msg || isQuoted).seconds > 8) return m.reply("Maximum 8 seconds!");
               let med = await sock.downloadAndSaveMediaMessage(isQuoted, + new Date * 1);
               await sock.vidToSticker(m.chat, med, m, { packname: "", author: sticker.author });
               fs.unlinkSync(med);
            } else if (/sticker/.test(mime)) {
               let med = await sock.downloadAndSaveMediaMessage(isQuoted, + new Date * 1);
               await sock.sendStickerFromUrl(m.chat, med, m, { packname: "", author: sticker.author });
               fs.unlinkSync(med);
            } else m.reply(`Send an image or reply to an image message with the caption ${prefix + command}`);
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   }
};