FROM node:18

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY services/user-service/package*.json ./services/user-service/
WORKDIR /app/services/user-service
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY shared ./shared
COPY services/user-service ./services/user-service

WORKDIR /app/services/user-service
EXPOSE 8080
CMD ["npm", "start"]
