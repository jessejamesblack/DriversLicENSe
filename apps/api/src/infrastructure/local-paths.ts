import { resolve } from "node:path";

export function dataDir(): string {
  return process.env.DATA_DIR ?? resolve(process.cwd(), "../../.data");
}

