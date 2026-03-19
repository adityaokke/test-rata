export default () => ({
  nodeEnv:  process.env.NODE_ENV ?? 'development',
  port:     parseInt(process.env.PORT ?? '3000', 10),
  services: {
    auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001/graphql',
    chat: process.env.CHAT_SERVICE_URL ?? 'http://localhost:3002/graphql',
  },
})
