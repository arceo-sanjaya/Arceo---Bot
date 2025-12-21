export default {
   setdesc: {
      usage: ["setdesc"],
      async: async (m, { sock, text, message, access }) => {
         if (!access.isAdmin()) return;
         if (!access.isBotAdmin()) return;
         if (!text) return m.reply(message.noText);
         await sock.groupUpdateDescription(m.chat, text);
         m.reply("Group description successfully updated.");
      }
   }
};