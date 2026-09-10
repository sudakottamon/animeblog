import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// TODO: 独自ドメイン取得後に差し替え
const SITE_URL = 'https://animeblog.kyoukarabokuha.workers.dev';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap({ filter: (page) => !page.includes('/api/') })],
  trailingSlash: 'always',
  adapter: cloudflare({ imageService: 'compile' }),
});
