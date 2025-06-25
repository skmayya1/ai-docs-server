FROM node:current-slim


WORKDIR /app

RUN apt-get update && \
    apt-get install -y libreoffice libreoffice-writer && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json tsconfig.json ./

RUN npm install

COPY ./src ./src

RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]