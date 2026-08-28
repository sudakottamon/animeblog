import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: 独自ドメイン取得後に差し替え
const SITE_URL = 'https://anime-vod-navi.pages.dev';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  trailingSlash: 'always',
});
