FROM node:current-alpine3.17
LABEL authors="me@mastomi.id"

WORKDIR /app
COPY . /app

RUN apk add --update nodejs npm tzdata curl

RUN cp /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
RUN adduser --disabled-password --home /app --uid 1337 app
RUN chown -R app:app /app

USER 1337

RUN npm install
RUN npm run build
RUN rm Dockerfile

EXPOSE 3000
CMD npm run start