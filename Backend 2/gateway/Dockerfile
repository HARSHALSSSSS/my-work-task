FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY gateway/package*.json ./gateway/
WORKDIR /app/gateway
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY gateway ./gateway

WORKDIR /app/gateway
EXPOSE 8080
CMD ["npm", "start"]
