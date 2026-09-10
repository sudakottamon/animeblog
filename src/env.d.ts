/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<{
  DB?: D1Database;
  IP_SALT?: string;
  ADMIN_TOKEN?: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
