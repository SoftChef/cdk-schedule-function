import { Request, Response } from '@softchef/lambda-events';

export async function handler(event: { [key: string]: any }) {
  const request = new Request(event);
  const response = new Response();
  console.log(JSON.stringify(event));
  return response.json({
    request,
  });
}