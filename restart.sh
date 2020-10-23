#!/bin/sh

NAME=wallet

docker container restart ${wallet}_api_1 && docker container restart ${wallet}_daemon_1

