import { NetworkStatus } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useCallback } from 'react'
import { useChatClient } from '../../../App'
import { MESSAGES_QUERY } from '../../../graphql/chat.queries'
import type { MessagesData } from '../../../types/chat.types'

export function useMessages(roomId: string | undefined) {
  const chatClient = useChatClient()

  const { data, loading, fetchMore, networkStatus } = useQuery<MessagesData>(
    MESSAGES_QUERY,
    {
      client: chatClient,
      variables: { input: { roomId, limit: 30 } },
      skip: !roomId,
      fetchPolicy: 'cache-and-network',
      pollInterval: 60000,
      notifyOnNetworkStatusChange: true,
    },
  )

  const isInitialLoading = loading && networkStatus === NetworkStatus.loading

  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (e.currentTarget.scrollTop > 60) return
      if (!data?.messages.hasMore || !data.messages.nextCursor) return

      await fetchMore({
        variables: {
          input: { roomId, limit: 30, cursor: data.messages.nextCursor },
        },
        updateQuery(prev, { fetchMoreResult }) {
          if (!fetchMoreResult) return prev
          return {
            messages: {
              ...fetchMoreResult.messages,
              items: [
                ...fetchMoreResult.messages.items,
                ...prev.messages.items,
              ],
            },
          }
        },
      })
    },
    [data, fetchMore, roomId],
  )

  return {
    data,
    loading,
    isInitialLoading,
    handleScroll,
  }
}
