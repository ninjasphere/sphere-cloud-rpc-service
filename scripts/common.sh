#!/bin/bash

PROJECT=sphere-cloud-rpc-service
EB_BUCKET=ninjablocks-sphere-docker

APP_NAME=sphere-cloud-rpc-service
APP_ENV=Prod-env

DOCKER_ARGS="-H minotaur.local:5555"
DOCKERRUN_FILE=$SHA1-Dockerrun.aws.json
