export interface IncomingMessage {
  id:             string
  roomId:         string
  senderId:       string
  content:        string | null
  attachmentUrl:  string | null
  attachmentType: string | null
  sequenceNumber: number
  status:         string
  createdAt:      string
}