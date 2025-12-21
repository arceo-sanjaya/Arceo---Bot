export default {
   tagall: {
      usage: ["tagall"],
      async: async (m, { sock, text, access }) => {
         if (!access.isAdmin()) return;
         const groupMetadata = await sock.groupMetadata(m.chat).catch(e => {});
         const participants = await groupMetadata.participants;
         let txt = `*TAG ALL*\n\nMessage: ${text || "None"}\n\n`;
         for (let mem of participants) { txt += `• @${mem.id.split("@")[0]}\n`; }
         sock.sendMessage(m.chat, { text: txt, mentions: participants.map(a => a.id) }, { quoted: m });
      }
   }
};