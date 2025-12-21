export default {
   kick: {
      usage: ["kick"],
      async: async (m, { sock, text, message, access }) => {
         if (!access.isAdmin()) return;
         if (!access.isBotAdmin()) return;
         let usrs = m.mentionedJid[0] ? m.mentionedJid : m.quoted ? [m.quoted.sender] : text.replace(/[^0-9]/g, "").length > 0 ? [text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"] : [];
         if (usrs.length === 0) return m.reply(message.noTag);
         await sock.groupParticipantsUpdate(m.chat, usrs, "remove");
         m.reply("User kicked successfully.");
      }
   }
};