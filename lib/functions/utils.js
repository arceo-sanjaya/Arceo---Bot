const { proto, getContentType } = require("yume-baileys");
const axios = require("axios");
const fs = require("fs");
const readline = require("readline");

function Enc(message) {
  return encodeURIComponent(message);
}

exports.Enc = Enc

function formatIDR(number) {
    let formattedAmount = "";
    const reversedNumber = number.toString().split("").reverse().join("");
    
    for (let i = 0; i < reversedNumber.length; i++) {
        if (i % 3 == 0) formattedAmount += reversedNumber.substr(i, 3) + ".";
    }
    
    return "" + formattedAmount.split("", formattedAmount.length - 1).reverse().join("");
}

exports.formatIDR = formatIDR

function formatUSD(number) {
    const exchangeRate = 15000;
    const usdAmount = number / exchangeRate;
    const formattedAmount = usdAmount.toFixed(2);
    const parts = formattedAmount.split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return "$" + integerPart + "." + parts[1];
}

exports.formatUSD = formatUSD

async function fetchJson(url, options) {
    try {
        const res = await axios({
            method: "GET",
            url: url,
            ...options
        });
        return res.data;
    } catch (err) {
        return err;
    }
}

exports.fetchJson = fetchJson

function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
}

exports.formatBytes = formatBytes

async function getInput(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(message, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

exports.getInput = getInput

async function getBuffer(url, options) {
    try {
        const res = await axios({
            method: "get",
            url,
            headers: {
                "DNT": 1,
                "Upgrade-Insecure-Request": 1
            },
            ...options,
            responseType: "arraybuffer"
        });
        return res.data;
    } catch (err) {
        return err;
    }
}

exports.getBuffer = getBuffer

function getTypeMessage(message) {
  	  const type = Object.keys(message);
			var restype =  (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) || 
					(type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) || 
					type[type.length - 1] || Object.keys(message)[0];
	return restype;
}

exports.getTypeMessage = getTypeMessage

function randomCharacter(amount) {
    const letter = "abcdefghijklmnopqrstuvwxyz";
    let results = "";
    for (let i = 0; i < amount; i++) {
        const randomIndex = Math.floor(Math.random() * letter.length);
        let randomLetters = letter[randomIndex];
        randomLetters = Math.random() < 0.5 ? randomLetters.toUpperCase() : randomLetters;
        results += randomLetters;
    }
    return results;
}

exports.randomCharacter = randomCharacter

function randomNumber(min, max = null) {
    if (max !== null) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
        return Math.floor(Math.random() * min) + 1;
    }
}

exports.randomNumber = randomNumber

function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
    
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

exports.runtime = runtime

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.sleep = sleep

exports.smsg = (arceo, m, store) => {
    if (!m) {
        return m;
    }

    let M = proto.WebMessageInfo;
    var m = M.fromObject(m);

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = (m.id.startsWith("B1EY") && m.id.length === 20) ||
                      (m.id.startsWith("BAE5") && m.id.length === 16) ||
                      (m.id.startsWith("3EB0") && (m.id.length === 22 || m.id.length === 40));
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith("@g.us");
        m.sender = arceo.decodeJid(m.fromMe && arceo.user.id || m.participant || m.key.participant || m.chat || "");

        if (m.isGroup) {
            m.participant = arceo.decodeJid(m.key.participant) || "";
        }
    }

    if (m.message) {
        m.mtype = getTypeMessage(m.message);
        m.msg = (m.mtype == "viewOnceMessage" ? m.message[m.mtype].message[getTypeMessage(m.message[m.mtype].message)] : m.message[m.mtype]);

        m.body = (m.mtype === "interactiveResponseMessage") ? 
            JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id :
            m.message?.conversation ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.extendedTextMessage?.text ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.templateButtonReplyMessage?.selectedId ||
            m.message?.messageContextInfo?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.messageContextInfo?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            (m.mtype === "viewOnceMessageV2" && (m.msg.message?.imageMessage?.caption || m.msg.message?.videoMessage?.caption)) || "";

        m.fileName = (m.mtype === "documentMessage" && m.msg.fileName) || (m.mtype === "audioMessage" && m.msg.fileName) || null;
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];

        if (m.mtype == "viewOnceMessageV2" || m.msg.url) {
            m.download = () => arceo.downloadMediaMessage(m);
        }

        m.copy = () => exports.smsg(arceo, M.fromObject(M.toObject(m)), store);
        m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => arceo.copyNForward(jid, m, forceForward, options);
        m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? arceo.sendMedia(chatId, text, "file", "", m, { ...options }) : arceo.sendText(chatId, text, m, { ...options });

        let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;

        if (m.quoted) {
            let type = Object.keys(quoted)[0];
            m.quoted = m.quoted[type];

            if (["productMessage"].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }

            if (typeof m.quoted === "string") {
                m.quoted = { text: m.quoted };
            }

            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? 
                (m.quoted.id.startsWith("B1EY") && m.quoted.id.length === 20) || 
                (m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16) || 
                (m.quoted.id.startsWith("3EB0") && (m.quoted.id.length === 22 || m.quoted.id.length === 40)) : 
                false;

            m.quoted.sender = arceo.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === (arceo.user && arceo.user.jid);
            m.quoted.text = m.quoted.text || 
                            m.quoted.caption || 
                            m.quoted.conversation || 
                            m.quoted.contentText || 
                            m.quoted.selectedDisplayText || 
                            m.quoted.title || 
                            m.quoted.name || 
                            m.quoted.body?.text || 
                            m.quoted.message?.imageMessage?.caption || 
                            m.quoted.message?.videoMessage?.caption || 
                            "";

            m.quoted.fileName = (m.quoted.mtype === "documentMessage" && m.quoted.fileName) || (m.quoted.mtype === "audioMessage" && m.quoted.fileName) || null;
            m.quoted.mentionedJid = m.quoted.contextInfo ? m.quoted.contextInfo.mentionedJid : [];

            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });

            m.quoted.download = () => arceo.downloadMediaMessage(m.quoted);
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => arceo.copyNForward(jid, vM, forceForward, options);
            m.quoted.delete = () => arceo.sendMessage(m.quoted.chat, { delete: vM.key });

            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) {
                    return false;
                }
                let q = await store.loadMessage(m.chat, m.quoted.id, arceo);
                return exports.smsg(arceo, q, store);
            };
        }
    }

    m.name = arceo.getName(m.sender);

    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.body || "";

    arceo.appenTextMessage = async(text, chatUpdate) => {
        let messages = await generateWAMessage(m.chat, { text: text, mentions: m.mentionedJid }, {
            userJid: arceo.user.id,
            quoted: m.quoted && m.quoted.fakeObj
        });
        messages.key.fromMe = areJidsSameUser(m.sender, arceo.user.id);
        messages.key.id = m.key.id;
        messages.pushName = m.pushName;
        if (m.isGroup) messages.participant = m.sender;
        let msg = {
            ...chatUpdate,
            messages: [proto.WebMessageInfo.fromObject(messages)],
            type: "append"
        };
        arceo.ev.emit("messages.upsert", msg);
    };

    return m;
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Update ${__filename}`);
    delete require.cache[file];
    require(file);
});