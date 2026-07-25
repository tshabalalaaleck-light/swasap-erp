FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/lib/seed.js && node dist/index.js"]
