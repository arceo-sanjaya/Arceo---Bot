const axios = require("axios");
const fs = require("fs");
const formData = require("form-data");

async function catBox(path) {
  const data = new formData();
  data.append("reqtype", "fileupload");
  data.append("userhash", "");
  data.append("fileToUpload", fs.createReadStream(path));
  const config = {
    method: "POST",
    url: "https://catbox.moe/user/api.php",
    headers: {
      ...data.getHeaders(),
      "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
    },
    data: data
  }
  const api = await axios.request(config);
  return api.data;
}

async function litterBox(path) {
    try {
        let form = new formData();
        form.append("fileToUpload", fs.createReadStream(path));
        form.append("reqtype", "fileupload");
        form.append("time", "24h");

        let { data } = await axios.post("https://litterbox.catbox.moe/resources/internals/api.php", form, {
            headers: {
                ...form.getHeaders()
            }
        });

        return data;
    } catch (err) {
        throw new Error(err.message);
    }
}

async function tempFiles(path) {
    try {
        const form = new formData();
        form.append("file", fs.createReadStream(path));

        const { data } = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: {
                ...form.getHeaders()
            }
        });

        let url = data.data.url;
        let result = url.replace(/\.org\//, ".org/dl/");

        return result;
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = {
    catBox,
    litterBox,
    tempFiles
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Update ${__filename}`);
    delete require.cache[file];
    require(file);
});