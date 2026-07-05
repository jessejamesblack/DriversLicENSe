import "reflect-metadata";
import awsLambdaFastify from "@fastify/aws-lambda";
import { Handler } from "aws-lambda";
import { createPolicyLensApp } from "./create-app";

let cachedHandler: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const app = await createPolicyLensApp();
  await app.init();
  const fastifyApp = app.getHttpAdapter().getInstance();
  await fastifyApp.ready();
  return awsLambdaFastify(fastifyApp as never) as Handler;
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler ??= await bootstrap();
  return cachedHandler(event, context, callback);
};
