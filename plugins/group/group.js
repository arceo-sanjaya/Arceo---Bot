export default {
   group: {
      usage: ["group"],
      async: async (m, { sock, prefix, command, args, access }) => {
         if (!access.isAdmin()) return;
         if (!access.isBotAdmin()) return;
         if (args[0] === "close") {
            await sock.groupSettingUpdate(m.chat, "announcement");
            m.reply("Group closed. Only admins can send messages.");
         } else if (args[0] === "open") {
            await sock.groupSettingUpdate(m.chat, "not_announcement");
            m.reply("Group opened. All participants can send messages.");
         } else {
            m.reply(`Usage: ${prefix + command} open/close`);
         }
      }
   }
};