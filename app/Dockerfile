# Dockerfile

FROM node:18-alpine

WORKDIR /usr/src/app

COPY wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

RUN npm install pm2 -g

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "pm2-runtime", "app.js", "-i", "max" ]