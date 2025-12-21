import fs from "fs";
import path from "path";
import webp from "node-webpmux";
import { spawn } from "child_process";

import { randomNumber } from "./utils.js";

const TRASH = "./data/trash";

function createExifBuffer(metadata) {
   try {
      const json = {
         "sticker-pack-id": "STICKER",
         "sticker-pack-name": metadata.packname,
         "sticker-pack-publisher": metadata.author,
         "emojis": metadata.categories || [""]
      };
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
      const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
      const exif = Buffer.concat([exifAttr, jsonBuff]);
      exif.writeUIntLE(jsonBuff.length, 14, 4);
      return exif;
   } catch (e) {
      throw new Error({ e });
   }
}

async function imageToWebp(media) {
   const tmpFileIn = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.jpg`);
   const tmpFileOut = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);

   try {
      await fs.promises.writeFile(tmpFileIn, media);
      await new Promise((resolve, reject) => {
         const ff = spawn("ffmpeg", [
            "-y", "-i", tmpFileIn,
            "-vcodec", "libwebp",
            "-vf", "scale=min(320\\,iw):min(320\\,ih):force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
            "-f", "webp", tmpFileOut
         ]);
         ff.on("error", reject);
         ff.on("close", (code) => {
            if (code === 0) resolve(true);
            else reject(new Error(`FFmpeg exited with code ${code}`));
         });
      });

      const buff = await fs.promises.readFile(tmpFileOut);
      return buff;
   } catch (e) {
      throw new Error({ e });
   } finally {
      if (fs.existsSync(tmpFileIn)) await fs.promises.unlink(tmpFileIn);
      if (fs.existsSync(tmpFileOut)) await fs.promises.unlink(tmpFileOut);
   }
}

async function videoToWebp(media) {
   const tmpFileIn = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.mp4`);
   const tmpFileOut = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);

   try {
      await fs.promises.writeFile(tmpFileIn, media);
      await new Promise((resolve, reject) => {
         const ff = spawn("ffmpeg", [
            "-y", "-i", tmpFileIn,
            "-vcodec", "libwebp",
            "-vf", "scale=min(320\\,iw):min(320\\,ih):force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
            "-loop", "0", "-ss", "00:00:00", "-t", "00:00:05",
            "-preset", "default", "-an", "-vsync", "0",
            "-f", "webp", tmpFileOut
         ]);
         ff.on("error", reject);
         ff.on("close", (code) => {
            if (code === 0) resolve(true);
            else reject(new Error(`FFmpeg exited with code ${code}`));
         });
      });

      const buff = await fs.promises.readFile(tmpFileOut);
      return buff;
   } catch (e) {
      throw new Error({ e });
   } finally {
      if (fs.existsSync(tmpFileIn)) await fs.promises.unlink(tmpFileIn);
      if (fs.existsSync(tmpFileOut)) await fs.promises.unlink(tmpFileOut);
   }
}

async function writeExifImg(media, metadata) {
   const wMedia = await imageToWebp(media);
   const tmpFileIn = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);
   const tmpFileOut = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);

   try {
      await fs.promises.writeFile(tmpFileIn, wMedia);
      if (metadata.packname || metadata.author) {
         const img = new webp.Image();
         const exif = createExifBuffer(metadata);
         await img.load(tmpFileIn);
         img.exif = exif;
         await img.save(tmpFileOut);
         return tmpFileOut;
      }
      return tmpFileIn;
   } catch (e) {
      if (fs.existsSync(tmpFileIn)) await fs.promises.unlink(tmpFileIn);
      throw new Error({ e });
   }
}

async function writeExifVid(media, metadata) {
   const wMedia = await videoToWebp(media);
   const tmpFileIn = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);
   const tmpFileOut = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);

   try {
      await fs.promises.writeFile(tmpFileIn, wMedia);
      if (metadata.packname || metadata.author) {
         const img = new webp.Image();
         const exif = createExifBuffer(metadata);
         await img.load(tmpFileIn);
         img.exif = exif;
         await img.save(tmpFileOut);
         return tmpFileOut;
      }
      return tmpFileIn;
   } catch (e) {
      if (fs.existsSync(tmpFileIn)) await fs.promises.unlink(tmpFileIn);
      throw new Error({ e });
   }
}

async function writeExif(media, metadata) {
   let wMedia;
   try {
      if (/webp/.test(media.mimetype)) {
         wMedia = media.data;
      } else if (/image/.test(media.mimetype)) {
         wMedia = await imageToWebp(media.data);
      } else if (/video/.test(media.mimetype)) {
         wMedia = await videoToWebp(media.data);
      } else {
         wMedia = "";
      }

      const tmpFileIn = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);
      const tmpFileOut = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.webp`);

      try {
         await fs.promises.writeFile(tmpFileIn, wMedia);
         if (metadata.packname || metadata.author) {
            const img = new webp.Image();
            const exif = createExifBuffer(metadata);
            await img.load(tmpFileIn);
            img.exif = exif;
            await img.save(tmpFileOut);
            return tmpFileOut;
         }
         return tmpFileIn;
      } catch (e) {
         if (fs.existsSync(tmpFileIn)) await fs.promises.unlink(tmpFileIn);
         throw new Error({ e });
      }
   } catch (e) {
      throw new Error({ e });
   }
}

function FFmpeg(buffer, args = [], ext = "", ext2 = "") {
   return new Promise(async (resolve, reject) => {
      const tmp = path.join(TRASH, `${Date.now()}_${randomNumber(1000, 9999)}.${ext}`);
      const out = `${tmp}.${ext2}`;
      try {
         await fs.promises.writeFile(tmp, buffer);
         const ff = spawn("ffmpeg", ["-y", "-i", tmp, ...args, out]);
         ff.on("error", (e) => reject(new Error({ e })));
         ff.on("close", async (code) => {
            try {
               await fs.promises.unlink(tmp);
               if (code !== 0) return reject(new Error(`FFmpeg exited with code ${code}`));
               const result = await fs.promises.readFile(out);
               await fs.promises.unlink(out);
               resolve(result);
            } catch (e) {
               reject(new Error({ e }));
            }
         });
      } catch (e) {
         if (fs.existsSync(tmp)) await fs.promises.unlink(tmp).catch(() => {});
         reject(new Error({ e }));
      }
   });
}

async function toAudio(buffer, ext) {
   try {
      return await FFmpeg(buffer, [
         "-vn", "-ac", "2", "-b:a", "128k", "-ar", "44100", "-f", "mp3"
      ], ext, "mp3");
   } catch (e) {
      throw new Error({ e });
   }
}

async function toPTT(buffer, ext) {
   try {
      return await FFmpeg(buffer, [
         "-vn", "-c:a", "libopus", "-b:a", "128k", "-vbr", "on", "-compression_level", "10"
      ], ext, "opus");
   } catch (e) {
      throw new Error({ e });
   }
}

async function toVideo(buffer, ext) {
   try {
      return await FFmpeg(buffer, [
         "-c:v", "libx264", "-c:a", "aac", "-ab", "128k", "-ar", "44100", "-crf", "32", "-preset", "slow"
      ], ext, "mp4");
   } catch (e) {
      throw new Error({ e });
   }
}

export {
   imageToWebp,
   videoToWebp,
   writeExifImg,
   writeExifVid,
   writeExif,
   toAudio,
   toPTT,
   toVideo
};