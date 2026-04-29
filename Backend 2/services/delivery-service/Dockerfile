FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/delivery-service/package*.json ./services/delivery-service/
WORKDIR /app/services/delivery-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/delivery-service ./services/delivery-service

WORKDIR /app/services/delivery-service
EXPOSE 8080
CMD ["npm", "start"]
