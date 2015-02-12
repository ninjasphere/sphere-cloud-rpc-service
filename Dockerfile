FROM nodesource/node:trusty

ADD . /app
WORKDIR /app

# install your application's dependencies
RUN apt-get install -yy --no-install-recommends git
RUN npm install

# replace this with your application's default port
EXPOSE 5900

# replace this with your startup command
CMD [ "node", "service.js" ]