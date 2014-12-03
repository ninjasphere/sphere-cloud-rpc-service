PROJECT ?= sphere-rpc-service
EB_BUCKET ?= ninjablocks-sphere-docker

APP_NAME ?= sphere-rpc-service
APP_ENV ?= sphere-rpc-prod
CONFIG ?= configs/options.sphere.mine.js

DOCKER_ARGS ?= -H dockerhost:5555
SHA1 := $(shell git rev-parse --short HEAD | tr -d "\n")

DOCKERRUN_FILE := Dockerrun.aws.json
APP_FILE := ${SHA1}.zip

all: build deploy

build:
	docker ${DOCKER_ARGS} build -t "docker-registry.sphere.ninja/ninjablocks/${PROJECT}:${SHA1}" .

local:
	docker ${DOCKER_ARGS} run -t -i --rm --link ninja-mysql:mysql --link ninja-rabbit:rabbitmq -e "USVC_CONFIG_ENV=docker" -e "NODE_ENV=development" -p 3333:3333 -t "docker-registry.sphere.ninja/ninjablocks/${PROJECT}:${SHA1}"

deploy:
	docker ${DOCKER_ARGS} push "docker-registry.sphere.ninja/ninjablocks/${PROJECT}:${SHA1}"
	sed "s/<TAG>/${SHA1}/" < Dockerrun.aws.json.template > ${DOCKERRUN_FILE}
	zip -r ${APP_FILE} ${DOCKERRUN_FILE} .ebextensions

	aws s3 cp ${APP_FILE} s3://${EB_BUCKET}/${APP_ENV}/${APP_FILE}

	aws elasticbeanstalk create-application-version --application-name ${APP_NAME} \
	   --version-label ${SHA1} --source-bundle S3Bucket=${EB_BUCKET},S3Key=${APP_ENV}/${APP_FILE}

	# # Update Elastic Beanstalk environment to new version
	aws elasticbeanstalk update-environment --environment-name ${APP_ENV} \
	    --version-label ${SHA1}

clean:
	rm *.zip || true
	rm ${DOCKERRUN_FILE} || true

.PHONY: all build local deploy clean
