import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'

function buildClient(uri: string) {
  const httpLink = createHttpLink({ uri })

  const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('access_token')
    return {
      headers: {
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  })

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    graphQLErrors?.forEach(({ extensions }) => {
      if (extensions?.code === 'UNAUTHORIZED') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    })
    if (networkError) console.error('[Network error]', networkError)
  })

  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
  })
}

// Two separate clients — one per service
export const authClient = buildClient(
  import.meta.env.VITE_AUTH_GRAPHQL_URL ?? 'http://localhost:3001/graphql',
)

export const chatClient = buildClient(
  import.meta.env.VITE_CHAT_GRAPHQL_URL ?? 'http://localhost:3002/graphql',
)
