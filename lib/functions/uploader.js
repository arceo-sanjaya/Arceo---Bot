import fs from "fs";
import formData from "form-data";

async function catBox(path) {
   const data = new formData();
   data.append("reqtype", "fileupload");
   data.append("userhash", "");
   data.append("fileToUpload", fs.createReadStream(path));

   const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      headers: {
         ...data.getHeaders(),
         "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
      },
      body: data
   });

   return await response.text();
}

async function litterBox(path) {
   try {
      let form = new formData();
      form.append("fileToUpload", fs.createReadStream(path));
      form.append("reqtype", "fileupload");
      form.append("time", "24h");

      let response = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
         method: "POST",
         headers: {
            ...form.getHeaders()
         },
         body: form
      });

      return await response.text();
   } catch (e) {
      throw new Error({ e });
   }
}

async function putIcu(path) {
   try {
      let response = await fetch("https://put.icu/upload/", {
         method: "PUT",
         body: fs.createReadStream(path),
         duplex: "half"
      });

      return await response.text();
   } catch (e) {
      throw new Error({ e });
   }
}

async function tempFiles(path) {
   try {
      const form = new formData();
      form.append("file", fs.createReadStream(path));

      const response = await fetch("https://tmpfiles.org/api/v1/upload", {
         method: "POST",
         headers: {
            ...form.getHeaders()
         },
         body: form
      });

      const data = await response.json();
      let url = data.data.url;
      let result = url.replace(/\.org\//, ".org/dl/");

      return result;
   } catch (e) {
      throw new Error({ e });
   }
}

export {
   catBox,
   litterBox,
   putIcu,
   tempFiles
};