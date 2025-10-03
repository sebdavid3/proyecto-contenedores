FROM node:18-alpine

WORKDIR /app

# Instalar Docker CLI en el contenedor
RUN apk add --no-cache docker-cli

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
