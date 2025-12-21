import fs from "fs";
import path from "path";
import util from "util";

import { config } from "../../lib/settings/loader.js";
import { formatBytes } from "../../lib/functions/utils.js";

const { owner, system, connect } = config;

const scan = (dir, name, res = []) => {
   try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
         if (f === "node_modules" || f === connect.session.name || f.startsWith(".")) continue;
         const fp = path.join(dir, f);
         const st = fs.statSync(fp);
         if (st.isDirectory()) scan(fp, name, res);
         else if (f === name) res.push(fp);
      }
   } catch {}
   return res;
};

export default {
   prefix: {
      usage: ["prefix"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isCreator()) return;
         const q = args[0];
         if (!q) return m.reply(`Usage: ${prefix + command} on/off`);
         if (q === "on") {
            if (global.db.settings.usePrefix) return m.reply("Prefix is already enabled.");
            global.db.settings.usePrefix = true;
            m.reply("Successfully enabled prefix.");
         } else if (q === "off") {
            if (!global.db.settings.usePrefix) return m.reply("Prefix is already disabled.");
            global.db.settings.usePrefix = false;
            m.reply("Successfully disabled prefix.");
         }
      }
   },

   public: {
      usage: ["public"],
      async: async (m, { sock, access }) => {
         if (!access.isOwner()) return;
         sock.public = true;
         m.reply("Successfully changed mode to public.");
      }
   },

   self: {
      usage: ["self"],
      async: async (m, { sock, access }) => {
         if (!access.isOwner()) return;
         sock.public = false;
         m.reply("Successfully changed mode to self.");
      }
   },

   addowner: {
      usage: ["addowner"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isOwner()) return;
         let nm = m.mentionedJid[0] ? m.mentionedJid[0] : args[0] ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
         if (!nm) return m.reply(`Usage: ${prefix + command} 628xxx`);
         let pn = nm.split("@")[0];
         if (global.db.settings.owners.includes(pn)) return m.reply("Number already in owner list.");
         global.db.settings.owners.push(pn);
         if (global.db.users[nm]) global.db.users[nm].role = "Owner";
         m.reply(`Successfully added ${pn} to owner list.`);
      }
   },

   delowner: {
      usage: ["delowner"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isOwner()) return;
         let nm = m.mentionedJid[0] ? m.mentionedJid[0] : args[0] ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
         if (!nm) return m.reply(`Usage: ${prefix + command} 628xxx`);
         let pn = nm.split("@")[0];
         let idx = global.db.settings.owners.indexOf(pn);
         if (idx > -1) {
            global.db.settings.owners.splice(idx, 1);
            if (global.db.users[nm]) global.db.users[nm].role = "Free";
            m.reply(`Successfully removed ${pn} from owner list.`);
         } else {
            m.reply("Number not found in owner list.");
         }
      }
   },

   listowner: {
      usage: ["listowner"],
      async: async (m) => {
         let own = global.db.settings.owners;
         let txt = "*LIST OF OWNERS*\n\n";
         txt += `• ${owner.number} (Main)\n`;
         own.forEach((num) => { txt += `• ${num}\n`; });
         m.reply(txt);
      }
   },

   addprem: {
      usage: ["addprem"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isOwner()) return;
         let nm = m.mentionedJid[0] ? m.mentionedJid[0] : args[0] ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
         if (!nm) return m.reply(`Usage: ${prefix + command} 628xxx`);
         if (global.db.users[nm]) {
            global.db.users[nm].role = "Premium";
            m.reply(`Successfully added ${nm.split("@")[0]} as a premium user.`);
         } else {
            global.db.users[nm] = { role: "Premium", name: "Unknown", banned: false };
            m.reply(`Successfully added ${nm.split("@")[0]} to the database as premium.`);
         }
      }
   },

   delprem: {
      usage: ["delprem"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isOwner()) return;
         let nm = m.mentionedJid[0] ? m.mentionedJid[0] : args[0] ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : "";
         if (!nm) return m.reply(`Usage: ${prefix + command} 628xxx`);
         if (global.db.users[nm]) {
            global.db.users[nm].role = "Free";
            m.reply(`Successfully removed premium status from ${nm.split("@")[0]}.`);
         } else {
            m.reply("User not found in database.");
         }
      }
   },

   listprem: {
      usage: ["listprem"],
      async: async (m) => {
         let usr = global.db.users;
         let prm = Object.keys(usr).filter(jid => usr[jid].role === "Premium");
         let txt = "*LIST OF PREMIUM USERS*\n\n";
         prm.forEach((jid, idx) => { txt += `${idx + 1}. @${jid.split("@")[0]}\n`; });
         if (prm.length === 0) txt += "No premium users found.";
         m.reply(txt);
      }
   },

   anticall: {
      usage: ["anticall"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isCreator()) return;
         if (!args[0]) return m.reply(`Usage: ${prefix + command} on/off`);
         if (args[0] === "on") {
            global.db.settings.antiCall = true;
            m.reply("AntiCall enabled.");
         } else if (args[0] === "off") {
            global.db.settings.antiCall = false;
            m.reply("AntiCall disabled.");
         }
      }
   },

   antispam: {
      usage: ["antispam"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isCreator()) return;
         if (!args[0]) return m.reply(`Usage: ${prefix + command} on/off`);
         if (args[0] === "on") {
            global.db.settings.antiSpam = true;
            m.reply("AntiSpam enabled.");
         } else if (args[0] === "off") {
            global.db.settings.antiSpam = false;
            m.reply("AntiSpam disabled.");
         }
      }
   },

   autoclear: {
      usage: ["autoclear"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isCreator()) return;
         if (!args[0]) return m.reply(`Usage: ${prefix + command} on/off`);
         if (args[0] === "on") {
            global.db.settings.autoClear = true;
            m.reply("AutoClear enabled.");
         } else if (args[0] === "off") {
            global.db.settings.autoClear = false;
            m.reply("AutoClear disabled.");
         }
      }
   },

   autoread: {
      usage: ["autoread"],
      async: async (m, { args, prefix, command, access }) => {
         if (!access.isCreator()) return;
         if (!args[0]) return m.reply(`Usage: ${prefix + command} on/off`);
         if (args[0] === "on") {
            global.db.settings.autoRead = true;
            m.reply("AutoRead enabled.");
         } else if (args[0] === "off") {
            global.db.settings.autoRead = false;
            m.reply("AutoRead disabled.");
         }
      }
   },

   savefile: {
      usage: ["savefile"],
      async: async (m, { text, prefix, command, isQuoted, access }) => {
         if (!access.isOwner()) return;
         if (!text) return m.reply(`Usage: ${prefix + command} sock.js`);
         if (!isQuoted) return m.reply("Reply to the code you want to save!");
         const fp = path.resolve(text);
         fs.writeFileSync(fp, isQuoted.text);
         m.reply(`Successfully saved file to ${fp}`);
      }
   },

   setppbot: {
      usage: ["setppbot"],
      async: async (m, { sock, isMedia, isQuoted, access }) => {
         if (!access.isOwner()) return;
         if (!isQuoted && !isMedia) return m.reply("Please send or reply to an image!");
         const med = await sock.downloadAndSaveMediaMessage(isQuoted || m, "ppbot");
         await sock.updateProfilePicture(sock.user.id.split(":")[0] + "@s.whatsapp.net", { url: med });
         fs.unlinkSync(med);
         m.reply("Successfully updated bot profile picture.");
      }
   },

   restart: {
      usage: ["restart"],
      async: async (m, { access }) => {
         if (!access.isOwner()) return;
         m.reply("Restarting system...");
         process.exit();
      }
   },

   ls: {
       usage: ["ls"],
       async: async (m, { text, prefix, command, access }) => {
         if (!access.isOwner()) return;

         if (text && text.trim() === "-h") {
            return m.reply(`\nUsage: ${prefix + command} [path] [flags]

Flags:
-h                Show help
-R [n]            Recursive list (optional depth)
-a                Show hidden files
-f <ext>          Filter extension
-s <mode>         Sort (name/size)
-r                Reverse sort
-u                Disk usage summary

Examples:
${prefix + command}
${prefix + command} -R 2
${prefix + command} -f js -s size\n`
            );
         }

         const arr = text ? text.split(" ").filter(Boolean) : [];
         let tgt = process.cwd();
         let dpt = 0;
         let all = false;
         let ext = null;
         let srt = "name";
         let rev = false;
         let dsk = false;

         for (let i = 0; i < arr.length; i++) {
            const flg = arr[i];
            if (flg === "-R") {
               const nxt = arr[i + 1];
               if (nxt && !isNaN(nxt)) { dpt = parseInt(nxt); i++; } 
               else dpt = Infinity;
            } 
            else if (flg === "-a") all = true;
            else if (flg === "-f") { ext = arr[i + 1]?.replace(".", ""); i++; }
            else if (flg === "-s") { srt = arr[i + 1] || "name"; i++; }
            else if (flg === "-r") rev = true;
            else if (flg === "-u") { dsk = true; all = true; }
            else tgt = path.resolve(flg);
         }

         if (!fs.existsSync(tgt)) return m.reply("Directory not found.");

         const skip = (e) => {
            if (!dsk && (e.name === "node_modules" || e.name === connect.session.name)) return true;
            if (e.name.startsWith(".")) { if (e.isDirectory()) return !all; return !all; }
            if (ext && e.isFile() && !e.name.endsWith("." + ext)) return true;
            return false;
         };

         const getRealDirSize = (dir) => {
            let size = 0;
            let list;
            try { list = fs.readdirSync(dir); } catch { return 0; }
            list.forEach(n => {
               const p = path.join(dir, n);
               let st;
               try { st = fs.statSync(p); } catch { return; }
               if (st.isDirectory()) size += getRealDirSize(p);
               else size += st.size;
            });
            return size;
         };

         let tDirs = 0;
         let tFiles = 0;
         let tSize = 0;

         const list = (d, p = "", dp = 0) => {
            if (dpt && dp >= dpt) return "";
            let ents;
            try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return ""; }
            ents = ents.filter(e => !skip(e));

            ents.sort((a, b) => {
               if (a.isDirectory() && !b.isDirectory()) return -1;
               if (!a.isDirectory() && b.isDirectory()) return 1;
               if (srt === "size") {
                  const sa = a.isFile() ? fs.statSync(path.join(d, a.name)).size : 0;
                  const sb = b.isFile() ? fs.statSync(path.join(d, b.name)).size : 0;
                  return sa - sb;
               }
               return a.name.localeCompare(b.name);
            });

            if (rev) ents.reverse();
            let out = "";

            ents.forEach((e, i) => {
               const last = i === ents.length - 1;
               const con = last ? "└── " : "├── ";
               const fp = path.join(d, e.name);

               if (e.isDirectory()) {
                  tDirs++;
                  const dSize = dsk ? getRealDirSize(fp) : 0;
                  out += p + con + e.name + (dsk ? ` [${formatBytes(dSize)}]` : "") + "\n";
                  
                  if (!dsk) {
                     out += list(fp, p + (last ? "    " : "│   "), dp + 1);
                  }
               } else {
                  let sz = 0;
                  try { sz = fs.statSync(fp).size; } catch {}
                  tFiles++;
                  tSize += sz;
                  out += p + con + e.name + "ㅤㅤ[" + formatBytes(sz) + "]\n";
               }
            });
            return out;
         };

         let res = list(tgt);

         if (dsk) {
             tDirs = 0;
             tFiles = 0;
             tSize = 0;
             const scanAll = (d) => {
                 try {
                     const items = fs.readdirSync(d, { withFileTypes: true });
                     items.forEach(e => {
                         const fp = path.join(d, e.name);
                         if (e.isDirectory()) {
                             tDirs++;
                             scanAll(fp);
                         } else {
                             tFiles++;
                             try { tSize += fs.statSync(fp).size; } catch {}
                         }
                     });
                 } catch {}
             };
             scanAll(tgt);
         }

         if (!res && !dsk) return m.reply("Empty directory.");
         m.reply(`${tgt}\n\n${res}\nDirs: ${tDirs}, Files: ${tFiles}\nTotal Size: ${formatBytes(tSize)}`);
      }
   },

   cp: {
      usage: ["cp"],
      async: async (m, { text, prefix, command, isQuoted, access }) => {
         if (!access.isOwner()) return;
         if (!text || !text.trim()) return m.reply(`Create: ${prefix + command} name|content\nCopy: ${prefix + command} src|dest`);

         try {
            if (text.includes("|")) {
               let [src, dst] = text.split("|").map(v => v.trim());
               if (!src || !dst) return m.reply(`Create: ${prefix + command} name|content\nCopy: ${prefix + command} src|dest`);

               const sp = path.resolve(src);
               let dp = path.resolve(dst);

               if (!fs.existsSync(sp)) {
                  const d = path.dirname(sp);
                  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
                  fs.writeFileSync(sp, dst);
                  return m.reply(`Created file ${sp}`);
               }

               const st = fs.statSync(sp);
               if (fs.existsSync(dp) && fs.statSync(dp).isDirectory()) dp = path.join(dp, path.basename(sp));
               const dd = path.dirname(dp);
               if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });

               if (st.isDirectory()) {
                  fs.cpSync(sp, dp, { recursive: true });
                  return m.reply(`Copied directory ${sp} to ${dp}`);
               }
               fs.copyFileSync(sp, dp);
               return m.reply(`Copied file ${sp} to ${dp}`);
            }

            if (isQuoted) {
               const fn = text.trim();
               const fp = path.resolve(fn);
               const d = path.dirname(fp);
               if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
               if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) return m.reply("Target path is a directory, not a file.");
               fs.writeFileSync(fp, isQuoted.text || "");
               return m.reply(`Saved quoted text to ${fp}`);
            }

            let q = text.trim();
            let idx = 0;
            const pt = q.split(" ");
            if (pt.length > 1 && !isNaN(pt[pt.length - 1])) {
               idx = parseInt(pt.pop()) - 1;
               q = pt.join(" ");
            }

            if (!q) return m.reply(`Create: ${prefix + command} name|content\nCopy: ${prefix + command} src|dest`);
            const res = scan(process.cwd(), q);
            if (res.length === 0) return m.reply("File not found.");
            if (res.length > 1 && idx < 0) return m.reply(`Found ${res.length} files. Please specify index: ${prefix + command} ${q} [1-${res.length}]`);

            const sel = res[idx] || res[0];
            const st = fs.statSync(sel);
            const dst = sel + "_copy";

            if (st.isDirectory()) fs.cpSync(sel, dst, { recursive: true });
            else fs.copyFileSync(sel, dst);
            return m.reply(`Copied ${sel} to ${dst}`);

         } catch (e) {
            console.error({ e })
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   mv: {
      usage: ["mv"],
      async: async (m, { text, prefix, command, access }) => {
         if (!access.isOwner()) return;
         if (!text || !text.trim()) return m.reply(`Usage: ${prefix + command} oldname|newname`);

         try {
            if (text.includes("|")) {
               let [src, dst] = text.split("|").map(v => v.trim());
               if (!src || !dst) return m.reply(`Usage: ${prefix + command} oldname|newname`);
               const sp = path.resolve(src);
               let dp = path.resolve(dst);
               if (!fs.existsSync(sp)) return m.reply("File not found.");
               if (fs.existsSync(dp) && fs.statSync(dp).isDirectory()) dp = path.join(dp, path.basename(sp));
               const dd = path.dirname(dp);
               if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
               fs.renameSync(sp, dp);
               return m.reply(`Moved ${sp} to ${dp}`);
            }

            let q = text.trim();
            let idx = 0;
            const pt = q.split(" ");
            if (pt.length > 1 && !isNaN(pt[pt.length - 1])) {
               idx = parseInt(pt.pop()) - 1;
               q = pt.join(" ");
            }

            const res = scan(process.cwd(), q);
            if (res.length === 0) return m.reply("File not found.");
            const sel = res[idx] || res[0];
            return m.reply(`File found: ${sel}\nPlease use pipe (|) for destination: ${prefix + command} ${path.basename(sel)}|newname`);
         } catch (e) {
            console.error({ e })
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   rm: {
      usage: ["rm"],
      async: async (m, { text, prefix, command, access }) => {
         if (!access.isOwner()) return;
         if (!text || !text.trim()) return m.reply(`Usage: ${prefix + command} filename`);

         try {
            const inp = text.trim();
            const dp = path.resolve(inp);
            if (fs.existsSync(dp)) {
               const st = fs.statSync(dp);
               if (st.isDirectory()) fs.rmSync(dp, { recursive: true, force: true });
               else fs.unlinkSync(dp);
               return m.reply(`Deleted ${dp}`);
            }

            let q = inp;
            let idx = 0;
            const pt = inp.split(" ");
            if (pt.length > 1 && !isNaN(pt[pt.length - 1])) {
               idx = parseInt(pt.pop()) - 1;
               q = pt.join(" ");
            }

            const res = scan(process.cwd(), q);
            if (res.length === 0) return m.reply("File not found.");
            const sel = res[idx] || res[0];
            const st = fs.statSync(sel);
            if (st.isDirectory()) fs.rmSync(sel, { recursive: true, force: true });
            else fs.unlinkSync(sel);
            return m.reply(`Deleted ${sel}`);

         } catch (e) {
            console.error({ e })
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   },

   cat: {
      usage: ["cat"],
      async: async (m, { text, prefix, command, access }) => {
         if (!access.isOwner()) return;
         if (!text || !text.trim()) return m.reply(`Usage: ${prefix + command} filename.js`);

         try {
            const inp = text.trim();
            const dp = path.resolve(inp);
            if (fs.existsSync(dp)) {
               const st = fs.statSync(dp);
               if (st.isDirectory()) return m.reply("Cannot display directory contents.");
               return m.reply(fs.readFileSync(dp, "utf-8"));
            }

            let q = inp;
            let idx = 0;
            const pt = inp.split(" ");
            if (pt.length > 1 && !isNaN(pt[pt.length - 1])) {
               idx = parseInt(pt.pop()) - 1;
               q = pt.join(" ");
            }

            const res = scan(process.cwd(), q);
            if (res.length === 0) return m.reply("File not found.");
            const sel = res[idx] || res[0];
            const st = fs.statSync(sel);
            if (st.isDirectory()) return m.reply("Cannot display directory contents.");
            return m.reply(fs.readFileSync(sel, "utf-8"));

         } catch (e) {
            console.error({ e })
            m.reply(`Error: ${util.format(e.message)}`);
         }
      }
   }
};