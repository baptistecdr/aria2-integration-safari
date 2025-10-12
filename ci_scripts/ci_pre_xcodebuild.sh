#!/usr/bin/env zsh

set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install --no-package-lock
npm run lint
npm run test:coverage
npm run build
