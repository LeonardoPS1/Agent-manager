FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# tsc only emits .js — the raw SQL migration has to be copied alongside it
RUN npm run build && cp -r src/db/migrations dist/db/migrations

EXPOSE 3000

# Run migrations, then start the API
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
