export default {
   setname: {
      usage: ["setname"],
      async: async (m, { sock, text, message, access }) => {
         if (!access.isAdmin()) return;
         if (!access.isBotAdmin()) return;
         if (!text) return m.reply(message.noText);
         await sock.groupUpdateSubject(m.chat, text);
         m.reply("Group name successfully updated.");
      }
   }
};