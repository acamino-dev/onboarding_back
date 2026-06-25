import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  DeleteCommandInput,
  DeleteCommandOutput,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  PutCommand,
  PutCommandInput,
  PutCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput,
  TransactWriteCommand,
  TransactWriteCommandInput,
  TransactWriteCommandOutput,
} from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({})
const documentClient = DynamoDBDocumentClient.from(client)

export const dynamoDb = {
  get: (params: GetCommandInput): Promise<GetCommandOutput> =>
    documentClient.send(new GetCommand(params)),
  query: (params: QueryCommandInput): Promise<QueryCommandOutput> =>
    documentClient.send(new QueryCommand(params)),
  scan: (params: ScanCommandInput): Promise<ScanCommandOutput> =>
    documentClient.send(new ScanCommand(params)),
  put: (params: PutCommandInput): Promise<PutCommandOutput> =>
    documentClient.send(new PutCommand(params)),
  update: (params: UpdateCommandInput): Promise<UpdateCommandOutput> =>
    documentClient.send(new UpdateCommand(params)),
  delete: (params: DeleteCommandInput): Promise<DeleteCommandOutput> =>
    documentClient.send(new DeleteCommand(params)),
  transactWrite: (params: TransactWriteCommandInput): Promise<TransactWriteCommandOutput> =>
    documentClient.send(new TransactWriteCommand(params)),
}

export type Company = {
  id: string
  name: string
  created_at: number
}
