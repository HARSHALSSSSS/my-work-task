FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/payment-service/package*.json ./services/payment-service/
WORKDIR /app/services/payment-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/payment-service ./services/payment-service

WORKDIR /app/services/payment-service
EXPOSE 8080
CMD ["npm", "start"]
