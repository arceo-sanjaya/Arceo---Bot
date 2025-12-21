import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const config = require("./config.json");
const msg = require("./message.json");
const thumb = require("./thumbnail.json");

export {
   config,
   msg,
   thumb
};