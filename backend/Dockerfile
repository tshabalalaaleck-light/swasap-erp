FROM node:20-alpine AS base
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY .
RUN npm run build

EXPOSE 4000

# Run migrations + seed once, then start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node backend/src/lib/seed.ts && node dist/index.js"]
