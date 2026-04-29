FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/finance-service/package*.json ./services/finance-service/
WORKDIR /app/services/finance-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/finance-service ./services/finance-service

WORKDIR /app/services/finance-service
EXPOSE 8080
CMD ["npm", "start"]
