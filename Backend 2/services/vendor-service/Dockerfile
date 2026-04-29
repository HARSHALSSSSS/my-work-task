FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/vendor-service/package*.json ./services/vendor-service/
WORKDIR /app/services/vendor-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/vendor-service ./services/vendor-service

WORKDIR /app/services/vendor-service
EXPOSE 8080
CMD ["npm", "start"]
