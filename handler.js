import fs from "fs";
import util from "util";
import { exec } from "child_process";

import {
   config,
   msg,
   thumb
} from "./lib/settings/loader.js";

const {
   bot,
   owner,
   sticker,
   system,
   connect
} = config;
const {
   message
} = msg;
const {
   thumbnail
} = thumb;

export default async (sock, m, chatUpdate, store) => {
   try {
      m.sender = m.sender.split("@")[0] + "@s.whatsapp.net"; 

      const body = m.body;
      const prefix = /^[!#.]/.test(body) ? body.match(/^[!#.]/gi)[0] : ".";
      const isCmd = body.startsWith(prefix);

      global.db = global.db || {};
      global.db.settings ||= {};
      global.db.users ||= {};
      global.db.groups ||= {};
      global.db.settings.owners ||= [];

      if (global.db.settings.usePrefix === undefined) global.db.settings.usePrefix = system.usePrefix;
      if (global.db.settings.antiCall === undefined) global.db.settings.antiCall = system.antiCall;
      if (global.db.settings.antiSpam === undefined) global.db.settings.antiSpam = system.antiSpam;
      if (global.db.settings.autoClear === undefined) global.db.settings.autoClear = system.autoClear;
      if (global.db.settings.autoRead === undefined) global.db.settings.autoRead = system.autoRead;

      const usePrefix = global.db.settings.usePrefix;
      const command = usePrefix ? (isCmd ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase() : "") : body.trim().split(" ").shift().toLowerCase();

      const isCreator = [owner.number, bot.number].filter(v => v).map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);

      const access = {
         isCreator: () => {
            if (!isCreator) { m.reply(message.creator); return false; }
            return true;
         }
      };

      if (body.startsWith("=> ")) {
         if (!m.fromMe && !isCreator) return;

         function Return(sul) {
            let resultString = JSON.stringify(sul, null, 2);
            let formatted_result = util.format(resultString);
            if (resultString === undefined) {
               formatted_result = util.format(sul);
            }
            return m.reply(formatted_result);
         }
         try {
            m.reply(util.format(eval(`(async () => { return ${body.slice(3)} })()`)));
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
         return
      }

      if (body.startsWith("> ")) {
         if (!m.fromMe && !isCreator) return;
         try {
            let evaled = await eval(body.slice(2));
            if (typeof evaled !== "string") {
               evaled = util.inspect(evaled);
            }
            m.reply(evaled);
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
         return
      }

      if (body.startsWith("$ ")) {
         if (!m.fromMe && !isCreator) return;
         try {
            exec(body.slice(2), (E, stdout) => {
               if (E) {
                  console.error({ E })
                  m.reply(`${E}`);
               }
               if (stdout) return m.reply(stdout);
            });
         } catch (e) {
            console.error({ e });
            m.reply(`Error: ${util.format(e.message)}`);
         }
         return
      }

      const plugin = sock.map.get(command);
      if (!plugin) return;

      if (global.db.settings.autoRead) {
          sock.readMessages([{
             remoteJid: m.chat,
             id: m.key.id,
             participant: m.isGroup ? m.key.participant : undefined
          }]).catch(() => {});
      }

      const args = body.trim().split(/ +/).slice(1);
      const full_args = body.replace(command, "").slice(1).trim();
      const text = args.join(" ");

      const isQuoted = m.quoted ? m.quoted : m;
      const mime = (isQuoted.msg || isQuoted).mimetype || "";
      const isMedia = /image|video|sticker|audio/.test(mime);

      const isOwner = isCreator || [global.db.settings.owners || []].flat().map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
      const isGroup = m.isGroup;

      let groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins;

      if (isGroup) {
         groupMetadata = await sock.groupMetadata(m.chat).catch(() => ({}));
         groupName = groupMetadata.subject || "";
         participants = groupMetadata.participants || [];
         groupAdmins = participants.filter(v => v.admin !== null).map(v => v.id);
         isBotAdmins = groupAdmins.includes(sock.user.id.split(":")[0] + "@s.whatsapp.net");
         isAdmins = groupAdmins.includes(m.sender);
      }

      access.isOwner = () => { if (!isOwner) { m.reply(message.owner); return false; } return true; };
      access.isGroup = () => { if (!isGroup) { m.reply(message.group); return false; } return true; };
      access.isAdmin = () => { if (!isGroup) { m.reply(message.group); return false; } if (!isAdmins && !isOwner) { m.reply(message.admin); return false; } return true; };
      access.isBotAdmin = () => { if (!isGroup) { m.reply(message.group); return false; } if (!isBotAdmins) { m.reply(message.botAdmin); return false; } return true; };

      const isBot = m.key.fromMe || m.sender === sock.decodeJid(sock.user.id).split("@")[0] + "@s.whatsapp.net";
      const isValidUser = /^[0-9]+@s\.whatsapp\.net$/.test(m.sender);

      if (!isBot && isValidUser) {
          let user = global.db.users[m.sender];
          const userName = m.pushName || (await sock.getName(m.sender)) || "Unknown";

          if (!user) {
             global.db.users[m.sender] = {
                name: userName,
                role: isCreator ? "Creator" : isOwner ? "Owner" : "Free",
                banned: false
             };
          } else {
             if (!user.name || user.name === "Unknown") user.name = userName;
             if (!user.role) user.role = isCreator ? "Creator" : isOwner ? "Owner" : "Free";
          }
      }

      if (isGroup) {
         let group = global.db.groups[m.chat];
         if (!group) global.db.groups[m.chat] = { mute: false };
      }

      const isPremium = isCreator || isOwner || (global.db.users[m.sender]?.role === "Premium");

      if (!sock.public) {
         if (!m.key.fromMe && !isOwner) return;
      }

      if (isGroup && global.db.groups[m.chat]?.mute && !isOwner && !isAdmins) return;

      await plugin.async(m, {
          sock,
          store,
          text,
          args,
          full_args,
          prefix,
          command,
          mime,
          isMedia,
          isQuoted,
          isOwner,
          isCreator,
          isPremium,
          isGroup,
          isAdmins,
          isBotAdmins,
          bot,
          owner,
          sticker,
          system,
          connect,
          message,
          thumbnail,
          access
      });

   } catch (e) {
      console.error({ e });
   }
};