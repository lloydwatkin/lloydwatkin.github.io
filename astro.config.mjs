// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Talks that used to live under /xmppuk-ietf/ (an old duplicate copy of the
// talks site). Redirect them to their canonical URLs so old links keep working.
const legacyTalks = [
  'intro-to-xmpp',
  'realtime-conf-2013',
  'realtime-conf-2013-intro',
  'xmpp-ftw-intro',
  'xmpp-workshop',
  'xmppuk-at-thingmonk',
  'mozilla-munich-xmpp-webrtc',
  'nodeconf-london-oneshot',
  'pinitto.me',
];

export default defineConfig({
  site: 'https://www.evilprofessor.co.uk',
  integrations: [mdx(), sitemap()],
  redirects: {
    '/xmppuk-ietf': '/talks/',
    ...Object.fromEntries(legacyTalks.map((t) => [`/xmppuk-ietf/${t}`, `/${t}/`])),
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    },
  },
});
