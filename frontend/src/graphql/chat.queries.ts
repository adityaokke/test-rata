import { gql } from '@apollo/client'

export const MY_ROOMS_QUERY = gql`
  query MyRooms {
    myRooms {
      id
      participantA
      participantB
      updatedAt
    }
  }
`

export const FIND_OR_CREATE_ROOM_MUTATION = gql`
  mutation FindOrCreateRoom($otherUserId: String!) {
    findOrCreateRoom(otherUserId: $otherUserId) {
      id
      participantA
      participantB
    }
  }
`

export const MESSAGES_QUERY = gql`
  query Messages($input: GetMessagesInput!) {
    messages(input: $input) {
      items {
        id
        roomId
        senderId
        content
        attachmentUrl
        attachmentType
        sequenceNumber
        status
        createdAt
      }
      nextCursor
      hasMore
    }
  }
`

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      queued
      idempotencyKey
      sequenceNumber
    }
  }
`
