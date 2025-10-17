FROM node:18-alpine

WORKDIR /app

# Instalar Docker CLI en el contenedor
RUN apk add --no-cache docker-cli

RUN npm install express@^4.18.2 cors@^2.8.5 body-parser@^1.20.2 dockerode@^4.0.0 uuid@^9.0.0 http-proxy-middleware@^2.0.6 axios@^1.6.0 dotenv@^16.0.0

COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
