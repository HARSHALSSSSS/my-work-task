FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/order-service/package*.json ./services/order-service/
WORKDIR /app/services/order-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/order-service ./services/order-service

WORKDIR /app/services/order-service
EXPOSE 8080
CMD ["npm", "start"]
