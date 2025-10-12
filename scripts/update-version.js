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
  try {
    const originalContent = fs.readFileSync(file, "utf8");
    if (file.indexOf(".json") === -1) {
      const marketingVersionFieldRegEx = /MARKETING_VERSION\s*=\s*"?[\w.-]+"?;/g;
      const currentVersionFieldRegEx = /CURRENT_PROJECT_VERSION\s*=\s*"?[\w.-]+"?;/g;
      let newContent = originalContent.replaceAll(marketingVersionFieldRegEx, `MARKETING_VERSION = "${version}";`);
      newContent = newContent.replaceAll(currentVersionFieldRegEx, `CURRENT_PROJECT_VERSION = "${shortSha}";`);
      fs.writeFileSync(file, newContent);
    } else {
      const jsonContent = JSON.parse(originalContent);
      jsonContent.version = version;
      jsonContent.version_name = `${version} (${shortSha})`;
      const newContent = `${JSON.stringify(jsonContent, null, 2)}\n`;
      fs.writeFileSync(file, newContent);
    }
  } catch (error) {
    console.error(`Unable to read/write the content of the file ${file}:`, error);
  }
}
