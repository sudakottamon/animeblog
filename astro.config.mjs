import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

const SITE_URL = 'https://anime.chottotools.com';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap({ filter: (page) => !page.includes('/api/') })],
  trailingSlash: 'always',
  adapter: cloudflare({ imageService: 'compile' }),
});
