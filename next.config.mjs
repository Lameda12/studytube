/** @type {import('next').NextConfig} */
export default {
  output: "export", // fully static site: deployable to Cloudflare Pages, Netlify, GitHub Pages or any CDN
  turbopack: { root: import.meta.dirname },
};
