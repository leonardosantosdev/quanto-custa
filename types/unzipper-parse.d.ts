declare module "unzipper/lib/parse" {
  import type { Duplex } from "node:stream";

  interface ParseOptions {
    forceStream?: boolean;
    verbose?: boolean;
  }

  export default function Parse(options?: ParseOptions): Duplex;
}
