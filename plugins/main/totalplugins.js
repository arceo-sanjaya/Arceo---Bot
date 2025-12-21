import fs from "fs";
import path from "path";

export default {
   totalplugins: {
      usage: ["totalplugins"],
      async: async (m, { sock }) => {
         try {
            const PLUGIN = path.join(process.cwd(), "plugins");
            const c = fs.readdirSync(PLUGIN).filter(file => fs.statSync(path.join(PLUGIN, file)).isDirectory());

            let text = "📊 *FEATURE STATISTICS*\n\n";
            let gTotal = 0;

            for (const category of c) {
               const cDir = path.join(PLUGIN, category);
               const files = fs.readdirSync(cDir).filter(file => file.endsWith(".js"));

               let cTotal = 0;
               let fRows = "";

               for (const file of files) {
                  try {
                     const fPath = path.join(cDir, file);
                     const fUrl = pathToFileURL(fPath).href;
                     const imported = await import(fUrl);
                     const plugins = imported.default || {};
                     let fCount = 0;

                     for (const key in plugins) {
                        if (plugins[key] && plugins[key].usage) {
                           fCount++;
                        }
                     }

                     if (fCount > 0) {
                        const indicator = fCount > 1 ? `ㅤㅤ(${fCount} plugin)` : "";
                        fRows += `- ${file}${indicator}\n`;
                        cTotal += fCount;
                     }
                  } catch (e) {
                     continue;
                  }
               }

               if (cTotal > 0) {
                  text += `*${category.charAt(0).toUpperCase() + category.slice(1)}* --- Total: ${cTotal}\n${fRows}\n`;
                  gTotal += cTotal;
               }
            }

            text += `*Total Features:* ${gTotal}`;
            m.reply(text);
         } catch (e) {
            console.error({ e })
            m.reply(`Error: ${e.message}`);
         }
      }
   }
};