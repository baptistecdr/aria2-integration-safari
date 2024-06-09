#!/usr/bin/env zsh

set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
# https://github.com/npm/cli/issues/4828
rm package-lock.json
npm install
npm run lint
npm run build
