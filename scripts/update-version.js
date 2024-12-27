#!/usr/bin/env node

import fs from "node:fs";

if (process.argv.length <= 3) {
  console.error("You need to specify a version and a short SHA.");
  process.exit();
}
let version = process.argv[2].trim();
if (version.startsWith("v")) {
  version = version.substring(1);
}

const shortSha = process.argv[3];

const filesToUpdate = ["public/manifest.json", "aria2-integration.xcodeproj/project.pbxproj"];

for (const file of filesToUpdate) {
  fs.readFile(file, "utf8", (err, data) => {
    if (err) {
      console.error(`Unable to read the content of the file '${file}'. (${err})`);
      return;
    }

    if (file.indexOf(".json") === -1) {
      const marketingVersionFieldRegEx = /MARKETING_VERSION\s*=\s*"?[\w.-]+"?;/g;
      const currentVersionFieldRegEx = /CURRENT_PROJECT_VERSION\s*=\s*"?[\w.-]+"?;/g;
      let newContent = data.replaceAll(marketingVersionFieldRegEx, `MARKETING_VERSION = "${version}";`);
      newContent = newContent.replaceAll(currentVersionFieldRegEx, `CURRENT_PROJECT_VERSION = "${shortSha}";`);
      fs.writeFile(file, newContent, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    } else {
      const content = JSON.parse(data);
      content.version = version;
      if (file === "public/manifest.json") {
        content.version_name = `${version} (${shortSha})`;
      }
      const newContent = `${JSON.stringify(content, null, 2)}\n`;
      fs.writeFile(file, newContent, (err1) => {
        if (err1) {
          console.error(`Unable to write the new content of the file '${file}'. (${err1})`);
        }
      });
    }
  });
}
