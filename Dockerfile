FROM nodesource/trusty:0.12.12

ADD . /app
WORKDIR /app

# install your application's dependencies
RUN npm install --production
RUN npm rebuild

# replace this with your application's default port
EXPOSE 5900

# replace this with your startup command
CMD [ "node", "service.js" ]