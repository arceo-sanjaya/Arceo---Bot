export default {
   hidetag: {
      usage: ["hidetag"],
      async: async (m, { sock, text, isQuoted, access }) => {
         if (!access.isAdmin()) return;
         const groupMetadata = await sock.groupMetadata(m.chat).catch(e => {});
         const participants = await groupMetadata.participants;
         if (isQuoted && (m.quoted.mtype === "imageMessage" || m.quoted.mtype === "videoMessage" || m.quoted.mtype === "stickerMessage")) {
             const med = await m.quoted.download();
             await sock.sendMessage(m.chat, {
                 [m.quoted.mtype.replace("Message", "")]: med,
                 caption: text || "",
                 mentions: participants.map(a => a.id)
             });
         } else {
             sock.sendMessage(m.chat, {
                text: text || "Attention!",
                mentions: participants.map(a => a.id)
             }, {
                quoted: m
             });
         }
      }
   }
};