FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/notification-service/package*.json ./services/notification-service/
WORKDIR /app/services/notification-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/notification-service ./services/notification-service

WORKDIR /app/services/notification-service
EXPOSE 8080
CMD ["npm", "start"]
