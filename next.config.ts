import type { NextConfig } from 'next'

// Not a full CSP (scripts and styles are left alone). It stops the site being framed (clickjacking) and images
// loading from anywhere but here: an image in a tutor reply could otherwise carry chat or plan text to another
// server, if a web page the tutor searched told it to write one.
const csp = [
  'frame-ancestors \'none\'',
  'img-src \'self\' data: blob:',
  'object-src \'none\'',
  'base-uri \'self\'',
  'form-action \'self\'',
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}

export default nextConfig
