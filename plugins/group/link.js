export default {
   link: {
      usage: ["link"],
      async: async (m, { sock, access }) => {
         if (!access.isGroup()) return;
         if (!access.isBotAdmin()) return;
         const cd = await sock.groupInviteCode(m.chat);
         m.reply(`https://chat.whatsapp.com/${cd}`);
      }
   }
};