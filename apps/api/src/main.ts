import "reflect-metadata";
import { createPolicyLensApp } from "./create-app";

async function bootstrap() {
  const app = await createPolicyLensApp();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`PolicyLens API listening on http://localhost:${port}`);
}

void bootstrap();
