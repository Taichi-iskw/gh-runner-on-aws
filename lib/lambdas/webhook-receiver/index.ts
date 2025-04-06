import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const sqsClient = new SQSClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const queueUrl = process.env.QUEUE_URL!;
  
  if (!event.body) {
    return { statusCode: 400, body: 'No body' };
  }

  const body = JSON.parse(event.body);

  await sqsClient.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(body),
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'OK' }),
  };
};