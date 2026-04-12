const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const hooksDir = path.join(projectRoot, ".git", "hooks");
const preCommitPath = path.join(hooksDir, "pre-commit");
const prePushPath = path.join(hooksDir, "pre-push");

if (!fs.existsSync(hooksDir)) {
  process.exit(0);
}

const preCommitContent = `#!/bin/sh
npm.cmd run test
`;

const prePushContent = `#!/bin/sh
npm.cmd run test:coverage
`;

fs.writeFileSync(preCommitPath, preCommitContent, "utf8");
fs.writeFileSync(prePushPath, prePushContent, "utf8");
