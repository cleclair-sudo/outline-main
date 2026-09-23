FROM node:20-alpine AS builder

WORKDIR /opt/outline

# Enable Corepack for Yarn 4
RUN corepack enable

# 1. Copy ALL files first
COPY . .

# 2. Run yarn install AFTER files are in place
RUN yarn install

# 3. Build the application
RUN yarn build

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /opt/outline

RUN corepack enable
ENV NODE_ENV=production

COPY --from=builder /opt/outline /opt/outline

EXPOSE 3000
CMD ["yarn", "start"]