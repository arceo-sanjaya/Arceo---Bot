const fs = require("fs");

module.exports = {
  info: require("./info.json"),
  thumb: require("./thumbnail.json")
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
   fs.unwatchFile(file);
   console.log(`Update ${__filename}`);
   delete require.cache[file];
   require(file);
});