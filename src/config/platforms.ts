/**
 * Controlled list of platform landing pages.
 *
 * IMPORTANT — dynamic SEO safety (see README "Adding a new platform"):
 * Pages are generated ONLY from the entries below. Nothing in this app
 * turns an arbitrary URL segment into an indexable page. To add a page,
 * add an entry here with real, unique content and set published: true.
 * Do not flip published to true until intro/howTo/faq are actually written —
 * an entry with placeholder copy is a thin page and must stay unpublished.
 */

export type FaqItem = { q: string; a: string };
export type FormatItem = { label: string; detail: string };
export type TroubleshootingItem = { issue: string; explanation: string };

export interface Platform {
  slug: string; // used as /{slug}
  name: string; // short platform name, e.g. "Instagram"
  brand: string; // full brand name if different, e.g. "X (formerly Twitter)"
  title: string; // <title>
  metaDescription: string;
  h1: string;
  tagline: string;
  color: string; // brand accent, used only as a small UI accent — not a logo
  published: boolean;
  urlExamples: string[];
  supportedContent: string[];
  intro: string[]; // paragraphs
  howTo: string[]; // ordered steps, platform-specific
  formats: FormatItem[];
  troubleshooting: TroubleshootingItem[];
  faq: FaqItem[];
  relatedSlugs: string[];
  redirectTo?: string; // if set, this slug 301s to another slug (dedupe overlapping brands)
  lastUpdated?: string; // ISO date — set to the real date this entry's content was last edited, never computed at build/request time (see sitemap.ts "no fabricated freshness")
}

export const platforms: Platform[] = [
  {
    slug: "instagram-video-downloader",
    name: "Instagram",
    brand: "Instagram",
    title: "Instagram Video Downloader – Download Public Videos & Reels",
    metaDescription:
      "Paste a public Instagram video, Reel, or IGTV link to download it in the original quality. No login, no app install, works on phone and desktop.",
    h1: "Instagram Video Downloader",
    tagline: "Save public Reels, posts, and IGTV videos from a link — a fast Insta downloader with no login.",
    color: "#E1306C",
    published: true,
    urlExamples: [
      "instagram.com/reel/CxAbC123xyz",
      "instagram.com/p/CxAbC123xyz",
      "instagram.com/tv/CxAbC123xyz",
    ],
    supportedContent: ["Reels", "Feed video posts", "IGTV", "Carousel posts containing video"],
    intro: [
      "Instagram splits video content across a few different formats — Reels, regular feed posts, IGTV, and carousels that mix photos and video in one post. Each of those has its own URL pattern, and that's the first thing that trips people up when a link doesn't work.",
      "This page handles public content across all four formats — essentially an Insta downloader for anything you can already view without logging in. If a post belongs to a private account, or the account has restricted downloads for a specific video, it can't be retrieved here — that's a deliberate limitation, not a bug, and it's covered in more detail below.",
    ],
    howTo: [
      "Open the Instagram post, Reel, or IGTV video in the app or in a browser.",
      "Tap the three-dot menu on the post and choose \"Copy Link.\" On desktop, copy the URL from the address bar instead.",
      "Paste the link into the box at the top of this page and press Download.",
      "Choose a quality if more than one is available, then save the file to your device.",
    ],
    formats: [
      { label: "MP4 (original quality)", detail: "The same resolution Instagram serves to the app, typically up to 1080p for Reels." },
      { label: "MP4 (compressed)", detail: "A smaller file size for quicker saves on mobile data, where offered." },
      { label: "Cover image (JPG)", detail: "The thumbnail frame, useful when you only need a still from the post." },
    ],
    troubleshooting: [
      { issue: "The link says the post is private or unavailable", explanation: "Instagram only allows public content to be fetched this way. If the account is private, or the specific post has been set to disable sharing, the request will fail even though the link looks valid." },
      { issue: "I copied the link but nothing happens", explanation: "Instagram Reel links sometimes include tracking parameters after a \"?\" — try removing everything from the question mark onward, or copy the link again using \"Copy Link\" rather than \"Share to...\"." },
      { issue: "The video downloads but has no sound", explanation: "This usually means the copied link pointed to a muted preview or a Story rather than the Reel/post itself. Re-open the post directly and copy the link from there." },
      { issue: "Carousel post only saved one video", explanation: "Carousels with multiple video clips need to be downloaded one slide at a time — swipe to the clip you want and copy that specific slide's link where Instagram provides one." },
    ],
    faq: [
      { q: "Can I download videos from a private Instagram account?", a: "No. Only content from public accounts can be downloaded here, and only when the account hasn't disabled sharing for that specific post." },
      { q: "Does this work for Instagram Stories?", a: "Stories aren't supported. They expire after 24 hours and Instagram doesn't expose a stable public link for them the way it does for Reels and posts." },
      { q: "What's the maximum video quality I can get?", a: "You'll get the same quality Instagram serves for that post — usually 720p or 1080p for Reels, depending on how the original was uploaded." },
      { q: "Is downloading someone else's Reel legal?", a: "That depends on what you do with it and your local copyright law. Saving a public video for personal, offline viewing is generally treated differently than re-uploading it elsewhere without permission — when in doubt, ask the creator or credit them." },
    ],
    relatedSlugs: ["facebook-video-downloader", "tiktok-video-downloader", "threads-video-downloader"],
    lastUpdated: "2026-09-09",
  },
  {
    slug: "facebook-video-downloader",
    name: "Facebook",
    brand: "Facebook",
    title: "Facebook Video Downloader – Download Public Videos & Reels",
    metaDescription:
      "Download public Facebook videos, Reels, and Watch clips by pasting the link. Choose SD or HD where available, no account needed.",
    h1: "Facebook Video Downloader",
    tagline: "Save public videos, Reels, and Watch clips from a link — works as a quick FB downloader too.",
    color: "#1877F2",
    published: true,
    urlExamples: [
      "facebook.com/username/videos/1234567890",
      "facebook.com/watch/?v=1234567890",
      "facebook.com/reel/1234567890",
      "fb.watch/AbCdEfGhIj/",
    ],
    supportedContent: ["Public page/profile videos", "Reels", "Watch videos", "Group videos (if the group is public)"],
    intro: [
      "Facebook video URLs come in more shapes than most platforms — full facebook.com links, shortened fb.watch links, Watch-tab links, and the newer Reels format. All of them work here as long as the video itself is public.",
      "Facebook also frequently offers a choice between SD and HD versions of the same upload, so once a link resolves you'll usually see both options rather than a single fixed quality.",
    ],
    howTo: [
      "Find the video on Facebook, in the app, on the Watch tab, or in a group.",
      "Click the three dots on the post and select \"Copy link,\" or copy the fb.watch short link if that's what you were sent.",
      "Paste it into the field on this page and press Download.",
      "Pick SD or HD if both are offered, then save the file.",
    ],
    formats: [
      { label: "MP4 (HD)", detail: "The higher-bitrate version, when the uploader made one available." },
      { label: "MP4 (SD)", detail: "A smaller, lower-bitrate file — often the only option for older or mobile-uploaded videos." },
      { label: "Audio only (M4A)", detail: "Extracts just the audio track, where offered, for interviews or podcast-style clips." },
    ],
    troubleshooting: [
      { issue: "\"This content isn't available\" error", explanation: "The video is either private, restricted to a specific audience (friends-only), or the group it was posted in isn't public. Facebook's privacy settings are enforced the same way here as they are in the app." },
      { issue: "fb.watch link doesn't resolve", explanation: "Short fb.watch links redirect through Facebook's servers before landing on the real video — occasionally that redirect expires. Open the link in a browser first, then copy the full facebook.com URL it lands on." },
      { issue: "Only SD is available, no HD option", explanation: "Not every upload has an HD version — this depends on the original upload quality and settings the uploader chose, not on anything this tool controls." },
    ],
    faq: [
      { q: "Can I download a video from a Facebook group?", a: "Only if the group itself is set to public. Content from closed or secret groups can't be accessed here, the same way it can't be viewed without joining." },
      { q: "Why does the same video sometimes give two different qualities?", a: "Facebook transcodes most uploads into multiple bitrates for streaming. When more than one is available, both are offered so you can choose file size versus quality." },
      { q: "Does this work with Facebook Watch shows and episodes?", a: "Yes, as long as the episode page is publicly viewable without logging in." },
    ],
    relatedSlugs: ["instagram-video-downloader", "youtube-video-downloader", "reddit-video-downloader"],
    lastUpdated: "2026-09-09",
  },
  {
    slug: "tiktok-video-downloader",
    name: "TikTok",
    brand: "TikTok",
    title: "TikTok Video Downloader – Save TikToks Without a Watermark",
    metaDescription:
      "Download public TikTok videos with or without the watermark. Paste a TikTok link to get MP4 video or extract just the audio.",
    h1: "TikTok Video Downloader",
    tagline: "Save public TikToks, with or without the watermark.",
    color: "#000000",
    published: true,
    urlExamples: [
      "tiktok.com/@username/video/7123456789012345678",
      "vm.tiktok.com/ZM8AbCdEf/",
      "vt.tiktok.com/ZSqUReF4j/",
    ],
    supportedContent: ["Public TikTok videos", "Photo-mode TikTok slideshows", "Original audio tracks"],
    intro: [
      "TikTok is the platform people most often ask about the watermark for. Every video is downloadable in its watermarked form directly from the share sheet already — what's actually useful here is the option to get a clean version without the TikTok logo and username overlay, and to pull out just the audio for videos built around a sound rather than the visuals.",
      "Photo-mode TikToks (slideshows set to music, rather than filmed video) are handled a little differently since there's no single video file — you'll get the option to download the slideshow's audio track separately from the images.",
    ],
    howTo: [
      "Open the TikTok you want to save and tap Share.",
      "Choose \"Copy link\" from the share sheet.",
      "Paste the link here and press Download.",
      "Pick watermark-free video, original video, or audio only.",
    ],
    formats: [
      { label: "MP4 (no watermark)", detail: "The cleanest version, with the TikTok logo and username overlay removed." },
      { label: "MP4 (with watermark)", detail: "Identical to what you'd get from TikTok's own share button." },
      { label: "MP3 (audio only)", detail: "Just the sound — the original audio or the sound the creator applied to the clip." },
    ],
    troubleshooting: [
      { issue: "The vm.tiktok.com or vt.tiktok.com link doesn't work", explanation: "Those short links expire faster than full tiktok.com/@user/video/ links. Open the short link in a browser once, let it redirect, then copy the full URL from the address bar." },
      { issue: "Video downloads but it's a slideshow, not a video", explanation: "Photo-mode TikToks aren't a single video file — download the audio track separately, or save the images from the post itself." },
      { issue: "\"Video unavailable\" for a video I can see in the app", explanation: "Some creators disable downloads for individual videos, or the account is set to private — both block third-party retrieval even though the video plays fine for you inside the TikTok app." },
    ],
    faq: [
      { q: "Is it legal to remove the TikTok watermark?", a: "Downloading your own content watermark-free is fine. For someone else's video, treat it as you would any copyrighted clip — personal use is generally lower-risk than reposting it elsewhere as if it were your own." },
      { q: "Can I download private TikTok accounts?", a: "No — only videos from public accounts can be retrieved." },
      { q: "Will the video quality match what's in the app?", a: "Yes, downloads use the same source file TikTok streams to the app, not a re-compressed copy." },
    ],
    relatedSlugs: ["instagram-video-downloader", "youtube-video-downloader", "threads-video-downloader"],
    lastUpdated: "2026-09-09",
  },
  {
    slug: "youtube-video-downloader",
    name: "YouTube",
    brand: "YouTube",
    title: "YouTube Video Downloader – Download Public Videos & Shorts",
    metaDescription:
      "Download public YouTube videos and Shorts by pasting the link. Choose from available resolutions or extract audio only — no account or software required.",
    h1: "YouTube Video Downloader",
    tagline: "Save public videos and Shorts in the resolution you need.",
    color: "#FF0000",
    published: true,
    urlExamples: [
      "youtube.com/watch?v=dQw4w9WgXcQ",
      "youtu.be/dQw4w9WgXcQ",
      "youtube.com/shorts/dQw4w9WgXcQ",
    ],
    supportedContent: ["Standard public videos", "Shorts", "Unlisted videos (with the direct link)"],
    intro: [
      "YouTube offers more resolution choices than most platforms — this page lists whatever the specific video actually has available, from 360p up to whatever the uploader published, rather than assuming a fixed set.",
      "Age-restricted, region-locked, and members-only videos aren't retrievable here, and that's intentional: those restrictions exist because the uploader or YouTube specifically limited access to them.",
    ],
    howTo: [
      "Copy the URL from the address bar, or use \"Share → Copy link\" in the app.",
      "Paste it into the field on this page and press Download.",
      "Pick a resolution — or choose audio-only if you just want the sound.",
      "Save the file once it's ready.",
    ],
    formats: [
      { label: "MP4 up to 1080p", detail: "The typical range available for most public uploads." },
      { label: "MP4 above 1080p", detail: "Offered when the source upload supports it; higher resolutions are larger files and take longer to prepare." },
      { label: "MP3 (audio only)", detail: "Useful for music, podcasts, or lectures where you don't need the picture." },
    ],
    troubleshooting: [
      { issue: "\"Video unavailable\" even though it plays on YouTube", explanation: "Age-restricted, region-locked, live-only, or members-only videos are blocked by design — those same restrictions apply here." },
      { issue: "Only low resolutions are offered", explanation: "Very old uploads, or videos still processing higher resolutions on YouTube's end, sometimes only have lower-resolution versions available yet." },
      { issue: "Shorts link redirects to a normal video page", explanation: "That's normal — Shorts and regular videos share the same underlying video ID, so both link formats point to the same file." },
    ],
    faq: [
      { q: "Can I download a live stream that's currently airing?", a: "No, only videos that have finished processing as regular uploads or replays can be downloaded." },
      { q: "Does this support playlists?", a: "This page handles one video at a time — paste each video's individual link." },
      { q: "Why is there no 4K option for some videos?", a: "Resolution depends entirely on what the uploader published; not every channel uploads in 4K even if their content looks sharp at 1080p." },
    ],
    relatedSlugs: ["tiktok-video-downloader", "facebook-video-downloader", "dailymotion-video-downloader"],
    lastUpdated: "2026-09-09",
  },
  {
    slug: "x-video-downloader",
    name: "X",
    brand: "X (formerly Twitter)",
    title: "X Video Downloader – Download Public Videos & GIFs",
    metaDescription:
      "Download public videos and GIFs from X (formerly Twitter) by pasting a post link. Works with replies and quote posts too.",
    h1: "X Video Downloader",
    tagline: "Save public videos and GIFs posted on X.",
    color: "#0F1419",
    published: true,
    urlExamples: [
      "x.com/username/status/1234567890123456789",
      "twitter.com/username/status/1234567890123456789",
    ],
    supportedContent: ["Videos in posts, replies, and quote posts", "Animated GIFs", "Posts with multiple attached videos"],
    intro: [
      "X still accepts both x.com and twitter.com links interchangeably — either one works here, since they point to the same underlying post. What matters more is whether the post itself is public: protected accounts are not accessible, regardless of which domain the link uses.",
      "A single post can carry more than one video. When that happens, this page lists each clip separately so you can pick the one you actually want instead of guessing which is first.",
    ],
    howTo: [
      "Open the post containing the video and tap the share icon.",
      "Choose \"Copy link to post.\"",
      "Paste the link here and press Download.",
      "If the post has more than one video, pick the clip you want.",
    ],
    formats: [
      { label: "MP4 (highest available)", detail: "The best quality X has encoded for that post, typically up to 1080p." },
      { label: "MP4 (lower bitrate)", detail: "A smaller alternative when X has generated more than one bitrate." },
      { label: "GIF → MP4", detail: "X stores \"GIFs\" as short silent MP4 loops; this delivers that native format." },
    ],
    troubleshooting: [
      { issue: "\"This post is from a protected account\" message", explanation: "Protected (private) accounts require an approved follow to view content — that restriction is enforced here too." },
      { issue: "Only a thumbnail downloads, no video", explanation: "This usually happens when the copied link points to the account's profile or a quote-post wrapper rather than the specific post that contains the video — open the video's own post and copy that link directly." },
      { issue: "Video plays fine on X but download fails here", explanation: "Some embeds are hosted externally (e.g. linked from another site) rather than uploaded natively to X, and those aren't retrievable through this tool." },
    ],
    faq: [
      { q: "Do I need an X account to use this?", a: "No — you only need the public post link." },
      { q: "Can I download videos from a thread?", a: "Yes, copy the link to the specific post in the thread that contains the video you want." },
      { q: "Why do people call this a Twitter downloader too?", a: "X was rebranded from Twitter in 2023; both names are still widely used for the same platform, which is why this page is titled for both." },
    ],
    relatedSlugs: ["reddit-video-downloader", "instagram-video-downloader", "youtube-video-downloader"],
    lastUpdated: "2026-09-09",
  },
  {
    slug: "pinterest-video-downloader",
    name: "Pinterest",
    brand: "Pinterest",
    title: "Pinterest Video Downloader – Download Public Pins",
    metaDescription:
      "Download video Pins from Pinterest by pasting the Pin link. Works with Idea Pins and standard video Pins, no account or browser extension needed.",
    h1: "Pinterest Video Downloader",
    tagline: "Save public video Pins from a link.",
    color: "#E60023",
    published: true,
    urlExamples: ["pinterest.com/pin/1234567890123456789/", "pin.it/AbCdEfG"],
    supportedContent: ["Standard video Pins", "Idea Pins (multi-page)"],
    intro: [
      "Most Pinterest content is images, but video Pins and multi-page Idea Pins are common enough that this page exists on its own rather than being folded into a generic \"other platforms\" catch-all.",
      "Idea Pins can contain several pages, only some of which may be video — this page lets you fetch the specific page's clip rather than assuming the whole Pin is one file.",
    ],
    howTo: [
      "Open the Pin and tap the share icon.",
      "Choose \"Copy link.\"",
      "Paste it here and press Download.",
      "If the Pin has multiple pages, select the page containing the video you want.",
    ],
    formats: [
      { label: "MP4", detail: "The standard video format Pinterest serves for Pins and Idea Pin pages." },
      { label: "Cover image (JPG)", detail: "The Pin's static thumbnail, useful if you only need a still." },
    ],
    troubleshooting: [
      { issue: "pin.it link doesn't resolve", explanation: "Open the shortened pin.it link in a browser first so it redirects to the full pinterest.com/pin/ URL, then copy that." },
      { issue: "Board link doesn't work", explanation: "This tool works on individual Pin links, not board URLs — open the specific Pin first." },
    ],
    faq: [
      { q: "Can I download a whole board at once?", a: "No, download Pins one at a time using each Pin's own link." },
      { q: "Does this work for private boards?", a: "No, only Pins that are publicly viewable can be retrieved." },
    ],
    relatedSlugs: ["instagram-video-downloader", "reddit-video-downloader"],
    lastUpdated: "2026-09-09",
  },
  // ---- Additional platforms named in the site architecture. Content for
  // these has not been written to the same depth yet, so they stay
  // unpublished (excluded from nav, sitemap, and indexing) until it is —
  // see README "Adding a new platform" for the checklist before flipping
  // published to true.
  {
    slug: "reddit-video-downloader",
    name: "Reddit",
    brand: "Reddit",
    title: "Reddit Video Downloader",
    metaDescription: "Download public Reddit videos by pasting a post link.",
    h1: "Reddit Video Downloader",
    tagline: "Save public Reddit videos from a link.",
    color: "#FF4500",
    published: false,
    urlExamples: ["reddit.com/r/subreddit/comments/abc123/title/"],
    supportedContent: ["Public post videos"],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
  },
  {
    slug: "snapchat-downloader",
    name: "Snapchat",
    brand: "Snapchat",
    title: "Snapchat Video Downloader",
    metaDescription: "Download public Snapchat Spotlight and story videos.",
    h1: "Snapchat Downloader",
    tagline: "Save public Snapchat videos from a link.",
    color: "#FFFC00",
    published: false,
    urlExamples: [],
    supportedContent: [],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
  },
  {
    slug: "threads-video-downloader",
    name: "Threads",
    brand: "Threads",
    title: "Threads Video Downloader",
    metaDescription: "Download public videos posted on Threads.",
    h1: "Threads Video Downloader",
    tagline: "Save public Threads videos from a link.",
    color: "#000000",
    published: false,
    urlExamples: [],
    supportedContent: [],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
  },
  {
    slug: "linkedin-video-downloader",
    name: "LinkedIn",
    brand: "LinkedIn",
    title: "LinkedIn Video Downloader",
    metaDescription: "Download public LinkedIn post videos.",
    h1: "LinkedIn Video Downloader",
    tagline: "Save public LinkedIn videos from a link.",
    color: "#0A66C2",
    published: false,
    urlExamples: [],
    supportedContent: [],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
  },
  {
    slug: "twitch-downloader",
    name: "Twitch",
    brand: "Twitch",
    title: "Twitch Clip Downloader",
    metaDescription: "Download public Twitch clips and VODs.",
    h1: "Twitch Downloader",
    tagline: "Save public Twitch clips from a link.",
    color: "#9146FF",
    published: false,
    urlExamples: [],
    supportedContent: [],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
  },
  {
    slug: "dailymotion-video-downloader",
    name: "Dailymotion",
    brand: "Dailymotion",
    title: "Dailymotion Video Downloader",
    metaDescription: "Download public Dailymotion videos.",
    h1: "Dailymotion Video Downloader",
    tagline: "Save public Dailymotion videos from a link.",
    color: "#00D4FF",
    published: false,
    urlExamples: [],
    supportedContent: [],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
  },
  {
    slug: "twitter-video-downloader",
    name: "Twitter",
    brand: "Twitter",
    title: "Twitter Video Downloader",
    metaDescription: "Redirects to the X video downloader.",
    h1: "",
    tagline: "",
    color: "#0F1419",
    published: false,
    urlExamples: [],
    supportedContent: [],
    intro: [],
    howTo: [],
    formats: [],
    troubleshooting: [],
    faq: [],
    relatedSlugs: [],
    redirectTo: "x-video-downloader",
  },
];

export function getPublishedPlatforms(): Platform[] {
  return platforms.filter((p) => p.published);
}

export function getPlatformBySlug(slug: string): Platform | undefined {
  return platforms.find((p) => p.slug === slug);
}
