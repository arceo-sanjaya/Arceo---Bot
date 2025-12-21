export default {
   editinfo: {
      usage: ["editinfo"],
      async: async (m, { sock, prefix, command, args, access }) => {
         if (!access.isAdmin()) return;
         if (!access.isBotAdmin()) return;
         if (args[0] === "open") {
            await sock.groupSettingUpdate(m.chat, "unlocked");
            m.reply("Edit group info opened. All participants can edit group info.");
         } else if (args[0] === "close") {
            await sock.groupSettingUpdate(m.chat, "locked");
            m.reply("Edit group info closed. Only admins can edit group info.");
         } else {
            m.reply(`Usage: ${prefix + command} open/close`);
         }
      }
   }
};