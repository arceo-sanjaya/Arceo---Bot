export default {
   mute: {
      usage: ["mute"],
      async: async (m, { access }) => {
         if (!access.isAdmin()) return;
         global.db.groups[m.chat].mute = true;
         m.reply("Successfully muted this group.");
      }
   }
};