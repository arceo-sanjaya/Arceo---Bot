export default {
   revoke: {
      usage: ["revoke"],
      async: async (m, { sock, access }) => {
         if (!access.isAdmin()) return;
         if (!access.isBotAdmin()) return;
         await sock.groupRevokeInvite(m.chat);
         m.reply("Group link has been successfully reset.");
      }
   }
};