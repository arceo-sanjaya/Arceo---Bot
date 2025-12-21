import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export default {
   menu: {
      usage: ["menu"],
      async: async (m, { sock, prefix, text, args, bot }) => {
         const hr = new Date().getHours();
         const greetings = hr < 12 ? "good morning" : hr < 18 ? "good afternoon" : "good night";

         const pluginDir = path.join(process.cwd(), "plugins");
         const categories = fs.readdirSync(pluginDir).filter(file => fs.statSync(path.join(pluginDir, file)).isDirectory());

         let header = `
👋 Hi, ${greetings} ${global.db.users[m.sender].name}, welcome to ${bot.name}
📊 *Role:* ${global.db.users[m.sender].role}
`;

         let content = "";
         const mode = args[0] ? args[0].toLowerCase() : "";

         if (mode === "all" || categories.includes(mode)) {
             const catsToProcess = mode === "all" ? categories : [mode];

             for (const category of catsToProcess) {
                 content += `\n乂  \`\`\`${category.toUpperCase().replace("-", " ")}\`\`\`\n`;
                 const categoryDir = path.join(pluginDir, category);
                 const files = fs.readdirSync(categoryDir).filter(file => file.endsWith(".js"));

                 const commands = [];
                 for (const file of files) {
                     try {
                         const fpath = path.join(categoryDir, file);
                         const furl = pathToFileURL(fpath).href;
                         const imported = await import(furl);
                         const plugins = imported.default || {};

                         for (const key in plugins) {
                             if (plugins[key] && plugins[key].usage) {
                                 const usage = Array.isArray(plugins[key].usage) ? plugins[key].usage : [plugins[key].usage];
                                 usage.forEach(u => commands.push(u));
                             }
                         }
                     } catch (e) {}
                 }

                 commands.sort().forEach(cmd => {
                     content += ` • ${prefix}${cmd}\n`;
                 });
             }
         } else {
             content += `\n乂  \`\`\`LIST MENU\`\`\`\n`;
             content += ` • ${prefix}menu all\n`;
             categories.forEach(cat => {
                 content += ` • ${prefix}menu ${cat}\n`;
             });
             content += `\nType *${prefix}menu [category]* to see specific category.`;
         }

         await sock.sendMessage(m.chat, {
            text: header + content,
            contextInfo: {
               externalAdReply: {
                  title: bot.name,
                  body: "Simple WhatsApp Bot by Arceo",
                  thumbnail: fs.readFileSync("./lib/images/1.jpg"),
                  sourceUrl: "https://arceos.xyz/",
                  mediaType: 1,
                  renderLargerThumbnail: true
               }
            }
         }, {
            quoted: m
         });
      }
   }
};