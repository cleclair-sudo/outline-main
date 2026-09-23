FROM node:20-alpine AS builder

WORKDIR /opt/outline

# Enable Corepack to support Yarn 4+
RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /opt/outline

RUN corepack enable

ENV NODE_ENV=production

COPY --from=builder /opt/outline /opt/outline

EXPOSE 3000
CMD ["yarn", "start"]