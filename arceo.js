const {
   downloadContentFromMessage
} = require("yume-baileys");
const axios = require("axios");
const fs = require("fs");
const nodeOs = require("node-os-utils");
const os = require("os");
const path = require("path");
const util = require("util");
const {
   exec,
   execSync
} = require("child_process");
const {
   Enc,
   fetchJson,
   formatBytes,
   runtime
} = require("./lib/functions/utils");
const {
   catBox,
   litterBox,
   tempFiles
} = require("./lib/functions/uploader");

const {
   info,
   thumb
} = require("./lib/settings/loader");

const {
   bot,
   owner,
   sticker
} = info;
const {
   thumbnail
} = thumb;

module.exports = arceo = async (arceo, m) => {
   try {
      var body = m.body

      const prefix = /^[!#.]/.test(body) ? body.match(/^[!#.]/gi)[0] : ".";
      const isCommand = body.startsWith(prefix);
      const prefixedCmd = isCommand ?
         body.slice(prefix.length).trim().split(" ").shift().toLowerCase() : "";
      const unprefixedCmd = body
         .replace(/^[!#.]/, "")
         .trim()
         .split(/ +/)
         .shift()
         .toLowerCase();
      const command = bot.usePrefix ? prefixedCmd : unprefixedCmd;

      const args = body.trim().split(/ +/).slice(1)
      const full_args = body.replace(command, "").slice(1).trim()
      const text = q = args.join(" ")

      const isQuoted = m.quoted ? m.quoted : m;
      const mime = (isQuoted.msg || isQuoted).mimetype || "";
      const isMedia = /image|video|sticker|audio/.test(mime);

      const isOwner = m.sender === owner.number + "@s.whatsapp.net";

      if (body.startsWith("=> ")) {
         if (!m.fromMe && !isOwner) return;

         function Return(sul) {
            let resultString = JSON.stringify(sul, null, 2);
            let formatted_result = util.format(resultString);
            if (resultString === undefined) {
               formatted_result = util.format(sul);
            }
            return m.reply(formatted_result);
         }
         try {
            m.reply(util.format(eval(`(async () => { return ${body.slice(3)} })()`)));
         } catch (e) {
            console.error({ e });
            m.reply(`*An error occurred:* ${util.format(e.message)}`);
         }
         return
      }

      if (body.startsWith("> ")) {
         if (!m.fromMe && !isOwner) return;
         try {
            let evaled = await eval(body.slice(2));
            if (typeof evaled !== "string") {
               evaled = require("util").inspect(evaled);
            }
            m.reply(evaled);
         } catch (e) {
            console.error({ e });
            m.reply(`*An error occurred:* ${util.format(e.message)}`);
         }
         return
      }

      if (body.startsWith("$ ")) {
         if (!m.fromMe && !isOwner) return;
         try {
            exec(body.slice(2), (E, stdout) => {
               if (E) {
                  console.error({ e })
                  m.reply(`${E}`);
               }
               if (stdout) return m.reply(stdout);
            });
         } catch (e) {
            console.error({ e });
            m.reply(`*An error occurred:* ${util.format(e.message)}`);
         }
         return
      }

      async function vreact(emoji = "🔎") {
         await arceo.sendMessage(m.sender, {
            react: {
               text: emoji,
               key: m.key
            }
         });
      }

      switch (command) {

         // ======== The Start • Main Menu ======== //

         case "menu": {
            const response = `
乂  \`\`\`MAIN MENU\`\`\`
 • ${prefix}menu
 • ${prefix}info
 • ${prefix}prefix
 • ${prefix}totalfitur

乂  \`\`\`CONVERSATION AI\`\`\`
 • ${prefix}ai
 • ${prefix}chatgpt
 • ${prefix}gemini
 • ${prefix}venice

乂  \`\`\`TEXT TO IMAGE\`\`\`
 • ${prefix}fluxdev
 • ${prefix}fluxpro
 • ${prefix}imagen
 • ${prefix}wcream

乂  \`\`\`IMAGE TO IMAGE\`\`\`
 • ${prefix}nano
 • ${prefix}toanime
 • ${prefix}tofigure
 • ${prefix}tosketch

乂  \`\`\`DOWNLOADER\`\`\`
 • ${prefix}instagram
 • ${prefix}mediafire
 • ${prefix}spotify
 • ${prefix}tiktok

乂  \`\`\`CANVAS\`\`\`
 • ${prefix}brat
 • ${prefix}bratvideo
 • ${prefix}emojimix
 • ${prefix}qcsticker
 • ${prefix}sticker

${bot.name.toUpperCase()} - V${bot.version}
`
            await arceo.sendMessage(m.chat, {
               text: response,
               footer: null,
               buttons: [{
                  buttonId: `${prefix}info`,
                  buttonText: {
                     displayText: "INFO"
                  },
                  type: 1
               }],
               headerType: 1,
               viewOnce: true
            }, {
               quoted: m
            })
         }
         break

         case "info": {
            const osType = nodeOs.os.type()
            const release = os.release()
            const arch = os.arch()
            const nodeVersion = process.version
            const ip = await nodeOs.os.ip()

            const cpus = os.cpus()
            const cpuModel = cpus[0].model
            const coreCount = cpus.length
            const cpu = cpus.reduce((acc, cpu) => {
               acc.total += Object.values(cpu.times).reduce((a, b) => a + b, 0)
               acc.speed += cpu.speed
               acc.times.user += cpu.times.user
               acc.times.nice += cpu.times.nice
               acc.times.sys += cpu.times.sys
               acc.times.idle += cpu.times.idle
               acc.times.irq += cpu.times.irq
               return acc
            }, {
               speed: 0,
               total: 0,
               times: {
                  user: 0,
                  nice: 0,
                  sys: 0,
                  idle: 0,
                  irq: 0
               }
            })
            const cpuUsage = ((cpu.times.user + cpu.times.sys) / cpu.total * 100).toFixed(2) + "%"
            const loadAverage = os.loadavg()
            const totalMem = os.totalmem()
            const freeMem = os.freemem()
            const usedMem = totalMem - freeMem
            const storageInfo = await nodeOs.drive.info()

            const start = process.hrtime()
            await new Promise(resolve => setTimeout(resolve, 1))
            const diff = process.hrtime(start)
            const latency = (diff[0] * 1e9 + diff[1]) / 1e9

            const response = `
 *SERVER INFO*
• OS: ${osType} (${release})
• Architecture: ${arch}
• Node.js Version: ${nodeVersion}
• IP Address: ${ip}

 *SYSTEM CPU*
• Model: ${cpuModel}
• Speed: ${cpu.speed} MHz
• CPU Load: ${cpuUsage} (${coreCount} Core)
• Load Average: ${loadAverage.join(", ")}

 *MEMORY (RAM)*
• Total: ${formatBytes(totalMem)}
• Used: ${formatBytes(usedMem)}
• Available: ${formatBytes(freeMem)}

 *STORAGE*
• Total: ${storageInfo.totalGb} GB
• Used: ${storageInfo.usedGb} GB (${storageInfo.usedPercentage}%)
• Available: ${storageInfo.freeGb} GB (${storageInfo.freePercentage}%)

 *PING*
• Latency: ${latency.toFixed(4)} second
• Runtime: ${runtime(process.uptime())}
`
            m.reply(response)
         }
         break

         case "prefix": {
            if (!args[0]) {
               return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} on/off`)
            }
            if (args[0] === "on") {
               if (bot.usePrefix) {
                  return m.reply("Prefix has been previously activated")
               }
               bot.usePrefix = true
               m.reply("Successfully activated prefix")
            } else if (args[0] === "off") {
               if (!bot.usePrefix) {
                  return m.reply("Prefix was previously disabled")
               }
               bot.usePrefix = false
               m.reply("Successfully disabled the prefix")
            }
         }
         break

         case "totalfitur": {
            const totalFeatures = () => {
               let readFile = fs.readFileSync("./arceo.js").toString()
               let readCase = (readFile.match(/case\s*".*?"\s*:\s*{/g) || []).length
               return readCase
            }
            m.reply(`*Total Features:* ${totalFeatures()}`)
         }
         break

         // ======== Conversation AI

         case "ai": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} hello`)

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/ai4chat/chat?text=${Enc(text)}`)
               m.reply(res.result)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "chatgpt": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} hello`)

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/gpt/4o?text=${Enc(text)}`)
               m.reply(res.result)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "gemini": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} hello`)

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/gemini/2.5-flash/v1?text=${Enc(text)}`)
               m.reply(res.result)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "venice": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} hello`)

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/venice?text=${Enc(text)}`)
               m.reply(res.result)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         // ======== Text to Image

         case "fluxdev": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} handsome man`)
               vreact()

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/flux/dev?prompt=${Enc(text)}&ratio=9%3A16`)
               if (res && res.result) {
                  arceo.sendMessage(m.chat, {
                     image: {
                        url: res.result
                     },
                     caption: ""
                  }, {
                     quoted: m
                  })
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "fluxpro": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} handsome man`)
               vreact()

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/flux/pro?prompt=${Enc(text)}&ratio=9%3A16`)
               if (res && res.result) {
                  arceo.sendMessage(m.chat, {
                     image: {
                        url: res.result
                     },
                     caption: ""
                  }, {
                     quoted: m
                  })
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "imagen": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} handsome man`)
               vreact()

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/imagen/4-fast?prompt=${Enc(text)}&ratio=9%3A16`)
               if (res && res.result) {
                  arceo.sendMessage(m.chat, {
                     image: {
                        url: res.result
                     },
                     caption: ""
                  }, {
                     quoted: m
                  })
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "wcream": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} handsome man`)
               vreact()

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/writecream/image?prompt=${Enc(text)}&ratio=9%3A16`)
               if (res && res.result) {
                  arceo.sendMessage(m.chat, {
                     image: {
                        url: res.result
                     },
                     caption: ""
                  }, {
                     quoted: m
                  })
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         // ======== Image to Image

         case "nano": {
            if (!/image/.test(mime)) {
               return m.reply(`Send images or reply to image messages with captions\n\n*Example:* ${prefix + command} change the background to black color`)
            }
            if (!text) {
               return m.reply("Please provide a prompt")
            }
            vreact()

            try {
               const media = await arceo.downloadAndSaveMediaMessage(isQuoted)

               const imageUrl = await tempFiles(media)

               const res = await fetchJson(`https://api.nekolabs.web.id/ai/gemini/nano-banana?prompt=${Enc(text)}&imageUrl=${Enc(imageUrl)}`)
               if (res && res.result) {
                  arceo.sendMessage(m.chat, {
                     image: {
                        url: res.result
                     },
                     caption: ""
                  }, {
                     quoted: m
                  })
               }

               fs.unlinkSync(media)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "toanime": {
            if (!/image/.test(mime)) {
               return m.reply(`Send images or reply to image messages with captions\n\n*Example:* ${prefix + command}`)
            }
            vreact()

            try {
               const media = await arceo.downloadAndSaveMediaMessage(isQuoted)

               const imageUrl = await tempFiles(media)

               const {
                  data
               } = await axios.get(`https://api.siputzx.my.id/api/imgedit/convphoto?image=${Enc(imageUrl)}&template=anime&style=color_rough`, {
                  responseType: "arraybuffer"
               })
               if (data) {
                  arceo.sendMessage(m.chat, {
                     image: data,
                     caption: ""
                  }, {
                     quoted: m
                  })
               }

               fs.unlinkSync(media)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "tofigure": {
            if (!/image/.test(mime)) {
               return m.reply(`Send images or reply to image messages with captions\n\n*Example:* ${prefix + command}`)
            }
            vreact()

            try {
               const media = await arceo.downloadAndSaveMediaMessage(isQuoted)

               const imageUrl = await tempFiles(media)

               const res = await fetchJson(`https://api.nekolabs.web.id/tools/convert/tofigure?imageUrl=${Enc(imageUrl)}`)
               if (res && res.result) {
                  arceo.sendMessage(m.chat, {
                     image: {
                        url: res.result
                     },
                     caption: ""
                  }, {
                     quoted: m
                  })
               }

               fs.unlinkSync(media)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "tosketch": {
            if (!/image/.test(mime)) {
               return m.reply(`Send images or reply to image messages with captions\n\n*Example:* ${prefix + command}`)
            }

            vreact()

            try {
               const media = await arceo.downloadAndSaveMediaMessage(isQuoted)

               const imageUrl = await tempFiles(media)

               const {
                  data
               } = await axios.get(`https://api.siputzx.my.id/api/imgedit/convphoto?image=${Enc(imageUrl)}&template=sketch_v2&style=manga_sketch`, {
                  responseType: "arraybuffer"
               })
               if (data) {
                  arceo.sendMessage(m.chat, {
                     image: data,
                     caption: ""
                  }, {
                     quoted: m
                  })
               }

               fs.unlinkSync(media)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         // ======== Downloader

         case "ig":
         case "instagram": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} URL`)
               if (!text.includes("instagram.com")) return m.reply("Must be an Instagram link!")
               vreact()

               const response = await axios.get(`https://api.nekolabs.web.id/downloader/instagram?url=${Enc(text)}`)
               const result = response.data.result

               if (response.data.success && result.downloadUrl && result.downloadUrl.length > 0) {
                  const mediaUrl = result.downloadUrl[0]

                  if (result.metadata.isVideo) {
                     return await arceo.sendMessage(
                        m.chat, {
                           video: {
                              url: mediaUrl
                           },
                           caption: "",
                        }, {
                           quoted: m
                        }
                     )
                  } else {
                     return await arceo.sendMessage(
                        m.chat, {
                           image: {
                              url: mediaUrl
                           },
                           caption: "",
                        }, {
                           quoted: m
                        }
                     )
                  }
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "mf":
         case "mediafire": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} URL_MEDIAFIRE`)
               if (!text.includes("mediafire.com")) return m.reply("Must be a MediaFire link!")
               vreact()

               const response = await axios.get(`https://api.nekolabs.web.id/downloader/mediafire?url=${Enc(text)}`)
               const result = response.data.result

               if (response.data.success && result.download_url) {
                  return await arceo.sendMessage(
                     m.chat, {
                        document: {
                           url: result.download_url
                        },
                        caption: "",
                        fileName: result.filename,
                        mimetype: result.mimetype
                     }, {
                        quoted: m
                     }
                  )
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "sp":
         case "spotify": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} URL`)
               if (!text.includes("spotify.com") && !text.includes("open.spotify")) return m.reply("Must be a Spotify link!")
               vreact()

               const response = await axios.get(`https://api.nekolabs.web.id/downloader/spotify?url=${Enc(text)}`)
               const result = response.data.result

               if (response.data.success && result.downloadUrl) {
                  return await arceo.sendMessage(
                     m.chat, {
                        audio: {
                           url: result.downloadUrl
                        },
                        mimetype: "audio/mpeg",
                        caption: "",
                        ptt: false,
                     }, {
                        quoted: m
                     }
                  )
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "tt":
         case "tiktok": {
            try {
               if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} URL`)
               if (!text.includes("tiktok.com")) return m.reply("Must be a TikTok link!")
               vreact()

               const response = await axios.get(`https://api.nekolabs.web.id/downloader/tiktok?url=${Enc(text)}`)
               const result = response.data.result

               if (response.data.success && result) {

                  if (result.images && Array.isArray(result.images) && result.images.length > 0) {

                     for (let i = 0; i < result.images.length; i++) {
                        await arceo.sendMessage(
                           m.chat, {
                              image: {
                                 url: result.images[i]
                              },
                              caption: "",
                           }, {
                              quoted: m
                           }
                        )
                     }
                     return
                  }

                  if (result.videoUrl) {
                     return await arceo.sendMessage(
                        m.chat, {
                           video: {
                              url: result.videoUrl
                           },
                           caption: "",
                        }, {
                           quoted: m
                        }
                     )
                  }
               }
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         // ======== Canvas

         case "brat": {
            if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} hello`)
            if (text.length > 250) return m.reply("Limited characters, maximum 250 characters!")
            try {
               vreact()
               let res = await axios.get(`https://skyzxu-brat.hf.space/brat?text=${Enc(text)}`, {
                  responseType: "arraybuffer"
               })
               let buffer = Buffer.from(res.data)
               await arceo.sendImageAsSticker(m.chat, buffer, m, {
                  packname: "",
                  author: sticker.author
               })
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "bratvideo": {
            if (!text) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} hello`)
            if (text.length > 250) return m.reply("Limited characters, maximum 250 characters!")
            try {
               vreact()
               let res = await axios.get(`https://skyzxu-brat.hf.space/brat-animated?text=${Enc(text)}`, {
                  responseType: "arraybuffer"
               })
               let buffer = Buffer.from(res.data)
               await arceo.sendVideoAsSticker(m.chat, buffer, m, {
                  packname: "",
                  author: sticker.author
               })
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "emojimix": {
            if (!text.includes("+")) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} 😆+😂`)
            let [emoji1, emoji2] = text.split("+")
            if (!emoji1 || !emoji2) return m.reply(`Wrong way of using it!\n\n*Example:* ${prefix + command} 😆+😂`)
            try {
               vreact()
               let res = await axios.get(`https://emojik.vercel.app/s/${emoji1.codePointAt(0).toString(16)}_${emoji2.codePointAt(0).toString(16)}?size=256`, {
                  responseType: "arraybuffer"
               })
               let buffer = Buffer.from(res.data)

               await arceo.sendImageAsSticker(m.chat, buffer, m, {
                  packname: "",
                  author: sticker.author
               })
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "qc":
         case "qcsticker": {
            if (!args[0]) return m.reply(`Wrong way of using it!\n\n*Example 1:* ${prefix + command} white hello\n*Example 2:* Reply to a message with ${prefix + command} white`)

            try {
               vreact()

               let color = args[0].toLowerCase();
               let message;

               if (m.quoted && m.quoted.text) {
                  message = m.quoted.text;
               } else {
                  message = args.slice(1).join(" ");
               }

               if (!message) return m.reply(`Wrong way of using it!\n\n*Example 1:* ${prefix + command} white hello\n*Example 2:* Reply to a message with ${prefix + command} white`);
               if (message.length > 100) return m.reply("Limited characters, maximum 100 characters!");

               let backgroundColor;
               if (color === "pink") {
                  backgroundColor = "#f68ac9";
               } else if (color === "blue") {
                  backgroundColor = "#6cace4";
               } else if (color === "red") {
                  backgroundColor = "#f44336";
               } else if (color === "green") {
                  backgroundColor = "#4caf50";
               } else if (color === "yellow") {
                  backgroundColor = "#ffeb3b";
               } else if (color === "purple") {
                  backgroundColor = "#9c27b0";
               } else if (color === "darkblue") {
                  backgroundColor = "#0d47a1";
               } else if (color === "lightblue") {
                  backgroundColor = "#03a9f4";
               } else if (color === "orange") {
                  backgroundColor = "#ff9800";
               } else if (color === "black") {
                  backgroundColor = "#000000";
               } else if (color === "white") {
                  backgroundColor = "#ffffff";
               } else if (color === "teal") {
                  backgroundColor = "#008080";
               } else if (color === "lightpink") {
                  backgroundColor = "#FFC0CB";
               } else if (color === "magenta") {
                  backgroundColor = "#FF00FF";
               } else if (color === "skyblue") {
                  backgroundColor = "#00BFFF";
               } else if (color === "darkred") {
                  backgroundColor = "#8B0000";
               } else if (color === "orangered") {
                  backgroundColor = "#FF4500";
               } else if (color === "cyan") {
                  backgroundColor = "#48D1CC";
               } else if (color === "violet") {
                  backgroundColor = "#BA55D3";
               } else if (color === "darkgreen") {
                  backgroundColor = "#008000";
               } else if (color === "navyblue") {
                  backgroundColor = "#191970";
               } else if (color === "darkorange") {
                  backgroundColor = "#FF8C00";
               } else if (color === "darkpurple") {
                  backgroundColor = "#9400D3";
               } else if (color === "fuchsia") {
                  backgroundColor = "#FF00FF";
               } else if (color === "darkmagenta") {
                  backgroundColor = "#8B008B";
               } else if (color === "darkgray") {
                  backgroundColor = "#2F4F4F";
               } else if (color === "gold") {
                  backgroundColor = "#FFD700";
               } else if (color === "silver") {
                  backgroundColor = "#C0C0C0";
               } else {
                  return m.reply("That color was not found!");
               }

               const avatar = await arceo.profilePictureUrl(m.sender, "image").catch(() => "https://files.catbox.moe/nwvkbt.png")
               const json = {
                  type: "quote",
                  format: "png",
                  backgroundColor,
                  width: 512,
                  height: 768,
                  scale: 2,
                  messages: [{
                     entities: [],
                     avatar: true,
                     from: {
                        id: 1,
                        name: m.pushName,
                        photo: {
                           url: avatar
                        }
                     },
                     text: message,
                     replyMessage: {}
                  }]
               }
               const response = await axios.post("https://bot.lyo.su/quote/generate", json, {
                  headers: {
                     "Content-Type": "application/json"
                  }
               })
               const buffer = Buffer.from(response.data.result.image, "base64")
               await arceo.sendImageAsSticker(m.chat, buffer, m, {
                  packname: "",
                  author: sticker.author
               })
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         case "stiker":
         case "sticker": {
            if (!isQuoted) return m.reply(`Send images or reply to image messages with captions\n\n*Example:* ${prefix + command}`)
            try {
               vreact()

               if (isQuoted) {
                  let msg = isQuoted
                  let type = Object.keys(msg)[0]
                  if (msg[type].viewOnce) {
                     let media = await downloadContentFromMessage(msg[type], type == "imageMessage" ? "image" : "video")
                     let buffer = Buffer.from([])
                     for await (const chunk of media) {
                        buffer = Buffer.concat([buffer, chunk])
                     }
                     if (/video/.test(type)) {
                        if ((quoted.msg || isQuoted).seconds > 25) return m.reply("Maximum 25 seconds!")
                        await arceo.vidToSticker(m.chat, buffer, m, {
                           packname: "",
                           author: sticker.author
                        })
                        return
                     } else if (/image/.test(type)) {
                        await arceo.imgToSticker(m.chat, buffer, m, {
                           packname: "",
                           author: sticker.author
                        })
                        return
                     }
                  }
               }

               if (/image/.test(mime)) {
                  let media = await arceo.downloadAndSaveMediaMessage(isQuoted, + new Date * 1)
                  await arceo.imgToSticker(m.chat, media, m, {
                     packname: "",
                     author: sticker.author
                  })
                  fs.unlinkSync(media)
               } else if (/video/.test(mime)) {
                  if ((quoted.msg || isQuoted).seconds > 25) return m.reply("Maximum 25 seconds!")
                  let media = await arceo.downloadAndSaveMediaMessage(isQuoted, + new Date * 1)
                  await arceo.vidToSticker(m.chat, media, m, {
                     packname: "",
                     author: sticker.author
                  })
                  fs.unlinkSync(media)
               } else if (/sticker/.test(mime)) {
                  let media = await arceo.downloadAndSaveMediaMessage(isQuoted, + new Date * 1)
                  await arceo.sendStickerFromUrl(m.chat, media, m, {
                     packname: "",
                     author: sticker.author
                  })
                  fs.unlinkSync(media)
               } else m.reply(`Send images or reply to image messages with captions\n\n*Example:* ${prefix + command}`)
            } catch (e) {
               console.error({ e })
               m.reply(`*An error occurred:* ${e.message}`)
            }
         }
         break

         // ======== The End ======== //
      }
   } catch (e) {
      console.error({ e });
   }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
   fs.unwatchFile(file);
   console.log(`Update ${__filename}`);
   delete require.cache[file];
   require(file);
});