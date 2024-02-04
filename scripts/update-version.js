#!/usr/bin/env node

import fs from "fs";

if (process.argv.length <= 2) {
  console.error("You need to specify a version.");
  process.exit();
}
let version = process.argv[2].trim();
if (version.startsWith("v")) {
  version = version.substring(1);
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
      let newContent = data.replaceAll(marketingVersionFieldRegEx, `MARKETING_VERSION = "${version}";`);
      newContent = newContent.replaceAll(currentVersionFieldRegEx, `CURRENT_PROJECT_VERSION = "${version}";`)
      fs.writeFile(file, newContent, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    } else {
      const content = JSON.parse(data);
      if (file === "public/manifest.json") {
        content.version = version.replaceAll(/-beta\.\d+/g, "");
        content.version_name = version;
      } else {
        content.version = version;
      }
      const newContent = JSON.stringify(content, null, 2) + "\n";
      fs.writeFile(file, newContent, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    }
  });
});
