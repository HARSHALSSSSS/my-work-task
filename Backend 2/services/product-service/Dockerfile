FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/product-service/package*.json ./services/product-service/
WORKDIR /app/services/product-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/product-service ./services/product-service

WORKDIR /app/services/product-service
EXPOSE 8080
CMD ["npm", "start"]
