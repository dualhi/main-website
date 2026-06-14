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
    value: '3M+',
    label: 'Spotify streams',
  },
} as const;

/** Booking / management contact, surfaced prominently in the Links section. */
export const CONTACT = {
  label: 'Booking & Management',
  email: 'gm@giacomomoracreative.com',
} as const;

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
