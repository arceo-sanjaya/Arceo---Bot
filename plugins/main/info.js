import fs from "fs";
import os from "os";

import { formatBytes, runtime } from "../../lib/functions/utils.js";

export default {
   info: {
      usage: ["info"],
      async: async (m, { sock }) => {
         const cpus = os.cpus();
         const startSnapshot = os.cpus();
         const start = process.hrtime();

         await new Promise(resolve => setTimeout(resolve, 500));

         const endSnapshot = os.cpus();
         const diff = process.hrtime(start);
         const latency = (diff[0] * 1e9 + diff[1]) / 1e9;

         const coreDetails = endSnapshot.map((cpu, i) => {
            const start = startSnapshot[i];
            const end = cpu;
            const startTotal = Object.values(start.times).reduce((a, b) => a + b, 0);
            const endTotal = Object.values(end.times).reduce((a, b) => a + b, 0);
            const totalDiff = endTotal - startTotal;
            const startIdle = start.times.idle;
            const endIdle = end.times.idle;
            const idleDiff = endIdle - startIdle;
            const usage = totalDiff === 0 ? 0 : ((totalDiff - idleDiff) / totalDiff) * 100;
            let speed = end.speed;
            if (speed === 0) {
               const modelMatch = end.model.match(/(\d+(\.\d+)?)\s*GHz/i);
               if (modelMatch) speed = parseFloat(modelMatch[1]) * 1000;
            }
            return { speed: speed, usage: usage };
         });

         const totalCpuUsage = (coreDetails.reduce((acc, core) => acc + core.usage, 0) / coreDetails.length).toFixed(2);
         const cpuModel = cpus[0].model;
         const coreSpeed = coreDetails[0].speed;

         const totalMem = os.totalmem();
         const freeMem = os.freemem();
         const usedMem = totalMem - freeMem;
         const memUsage = process.memoryUsage();

         let totalStorage = 0;
         let freeStorage = 0;
         let usedStorage = 0;
         let usedPercentage = 0;
         let freePercentage = 0;

         try {
            const stats = fs.statfsSync("/");
            totalStorage = stats.bsize * stats.blocks;
            freeStorage = stats.bsize * stats.bfree;
            usedStorage = totalStorage - freeStorage;
            usedPercentage = ((usedStorage / totalStorage) * 100).toFixed(0);
            freePercentage = ((freeStorage / totalStorage) * 100).toFixed(0);
         } catch (e) {
            totalStorage = 0;
         }

         const response = `
\`\`\`SERVER INFO\`\`\`
• Platform: ${os.type()}
• Release: ${os.release()}
• Architecture: ${os.arch()}
• Node.js: ${process.version}
• Uptime OS: ${runtime(os.uptime())}

\`\`\`CPU SYSTEM\`\`\`
• Model: ${cpuModel}
• Speed: ${coreSpeed} MHz
• Global Load: ${totalCpuUsage}% (${coreDetails.length} Core)
• Load Average: ${os.loadavg().map(x => x.toFixed(2)).join(" | ")}

\`\`\`MEMORY USAGE\`\`\`
• Total: ${formatBytes(totalMem)}
• Used: ${formatBytes(usedMem)}
• Free: ${formatBytes(freeMem)}
• RSS: ${formatBytes(memUsage.rss)}
• Heap: ${formatBytes(memUsage.heapUsed)} / ${formatBytes(memUsage.heapTotal)}
• External: ${formatBytes(memUsage.external)}

\`\`\`STORAGE STATUS\`\`\`
• Total: ${formatBytes(totalStorage)}
• Used: ${formatBytes(usedStorage)} (${usedPercentage}%)
• Available: ${formatBytes(freeStorage)} (${freePercentage}%)

\`\`\`PERFORMANCE\`\`\`
• Latency: ${latency.toFixed(4)} second
• Runtime: ${runtime(process.uptime())}
`;
         m.reply(response);
      }
   }
};