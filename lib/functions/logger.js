import path from "path";
import util from "util";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const getCallerFile = () => {
   const oPST = Error.prepareStackTrace;
   Error.prepareStackTrace = (_, stack) => stack;
   const error = new Error();
   const stack = error.stack;
   Error.prepareStackTrace = oPST;

   let stackFiles = [];

   for (let i = 0; i < stack.length; i++) {
      let Fname = stack[i].getFileName();
      if (!Fname) continue;

      if (Fname.startsWith("file://")) {
         Fname = fileURLToPath(Fname);
      }

      if (Fname !== __filename && !Fname.includes("node_modules") && !Fname.includes("node:") && !Fname.includes("internal/")) {
         stackFiles.push(Fname);
      }
   }
   
   if (stackFiles.length > 1) return path.basename(stackFiles[1]);
   if (stackFiles.length === 1) return path.basename(stackFiles[0]);

   return "System";
};

const doFormat = (args) => {
   return `ㅤ\n[ ${getCallerFile()} ]\n\n${util.format(...args)}`;
};

const checkRaw = (args) => {
   const msg = util.format(...args);
   return !msg.trim() || msg.includes("\x1b");
};

export {
   getCallerFile,
   doFormat,
   checkRaw
}