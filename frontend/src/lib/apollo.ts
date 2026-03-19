import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, ServerError } from '@apollo/client'
import { SetContextLink } from '@apollo/client/link/context'
import { ErrorLink } from '@apollo/client/link/error'

function buildClient(uri: string) {
  const httpLink = new HttpLink({ uri })

  // SetContextLink replaces deprecated setContext()
  const authLink = new SetContextLink((prevContext) => {
    const token = localStorage.getItem('access_token')
    return {
      headers: {
        ...prevContext.headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }
  })

  // ErrorLink replaces deprecated onError()
  const errorLink = new ErrorLink(({ error }) => {
    if (ServerError.is(error) && error.statusCode === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  })

  // ApolloLink.from replaces deprecated from() and concat()
  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
  })
}

export const apolloClient = buildClient(
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql',
)

export const authClient = apolloClient
export const chatClient = apolloClient