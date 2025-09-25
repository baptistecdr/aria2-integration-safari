#!/usr/bin/env zsh

set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
# https://github.com/npm/cli/issues/4828
npm install --no-package-lock
npm run lint
npm run build
