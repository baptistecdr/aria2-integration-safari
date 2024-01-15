#!/usr/bin/env node

import fs from "fs";

if (process.argv.length <= 2) {
  console.error("You need to specify a new newVersion.");
  process.exit();
}
let newVersion = process.argv[2].trim();
if (newVersion.startsWith("v")) {
  newVersion = newVersion.substring(1);
}
const filesToUpdate = ["package.json", "public/manifest.json", "package-lock.json", "aria2-integration.xcodeproj/project.pbxproj"];

filesToUpdate.forEach((file) => {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      console.error(`Unable to read the content of the file '${file}'. (${err})`);
      return;
    }

    if (file.indexOf(".json") === -1) {
      const marketingVersionFieldRegEx = /MARKETING_VERSION\s*=\s*"?[\w.-]+"?;/g;
      const currentVersionFieldRegEx = /CURRENT_PROJECT_VERSION\s*=\s*"?[\w.-]+"?;/g;
      let newContent = data.replaceAll(marketingVersionFieldRegEx, `MARKETING_VERSION = "${newVersion}";`);
      newContent = newContent.replaceAll(currentVersionFieldRegEx, `CURRENT_PROJECT_VERSION = "${newVersion}";`)
      fs.writeFile(file, newContent, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    } else {
      const content = JSON.parse(data);
      content.version = newVersion;
      const newContent = JSON.stringify(content, null, 2) + "\n";
      fs.writeFile(file, newContent, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    }
  });
  
});
