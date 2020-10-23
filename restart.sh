#!/bin/sh

NAME=walletjs

docker container restart ${NAME}_api_1 && docker container restart ${NAME}_daemon_1

