export default {
   unmute: {
      usage: ["unmute"],
      async: async (m, { access }) => {
         if (!access.isAdmin()) return;
         global.db.groups[m.chat].mute = false;
         m.reply("Successfully unmuted this group.");
      }
   }
};