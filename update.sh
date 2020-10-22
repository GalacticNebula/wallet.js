#!/bin/sh

NAME=wallet

git pull && cd server && npm run build && cd .. && docker container restart ${wallet}_api_1 && docker container restart ${wallet}_daemon_1
