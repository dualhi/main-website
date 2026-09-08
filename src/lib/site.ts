/**
 * Single source of truth for site-wide config: SEO defaults, contact email,
 * social links and the bio stat. Edit values here — components read from this.
 */

export const SITE = {
  name: 'Dualhï',
  /** Used in <title> and OG tags. */
  title: 'Dualhï — Dance-Pop / Melodic EDM Duo',
  description:
    'Official press kit for Dualhï, a dance-pop / melodic EDM duo (Kevin Romero & Cristiano Gautier). Releases, bio, press photos and booking contact.',
  tagline: 'Dance-Pop / Melodic EDM duo',
  /** Path (relative to /public) to the default social-share image. */
  ogImage: '/og-image.jpg',
  /** Bio highlight stat. */
  stat: {
    value: '8.5M+',
    label: 'Spotify streams',
  },
} as const;

/**
 * Contacts surfaced in the Links section, in order of prominence.
 * The first one is rendered largest.
 */
export const CONTACTS = [
  { label: 'Booking & Management', email: 'gm@giacomomoracreative.com' },
  { label: 'General enquiries', email: 'info@wearedualhi.com' },
] as const;

/** Primary contact — kept for convenience. */
export const CONTACT = CONTACTS[0];

export interface SocialLink {
  name: string;
  url: string;
  /** Whether to repeat it in the compact footer row. */
  primary?: boolean;
}

export const SOCIALS: SocialLink[] = [
  { name: 'Spotify', url: 'https://open.spotify.com/artist/4HzQLZAdLvGvyqVhhJ5CW6', primary: true },
  { name: 'Apple Music', url: 'https://music.apple.com/us/artist/dualh%C3%AF/1479692979', primary: true },
  { name: 'SoundCloud', url: 'https://soundcloud.com/wearedualhi' },
  { name: 'Instagram', url: 'https://instagram.com/wearedualhi', primary: true },
  { name: 'TikTok', url: 'https://www.tiktok.com/@wearedualhi', primary: true },
  { name: 'Facebook', url: 'https://facebook.com/wearedualhi' },
];
