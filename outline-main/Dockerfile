FROM node:20-alpine AS builder

WORKDIR /opt/outline

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /opt/outline

ENV NODE_ENV=production

COPY --from=builder /opt/outline /opt/outline

EXPOSE 3000
CMD ["yarn", "start"]