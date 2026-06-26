import { Link as LinkIcon } from 'lucide-react';

export default function About() {
  return (
    <div className="about-page">
      <div className="page-header">
        <h1>About PixelFlow</h1>
        <p>A fast, simple image hosting and delivery platform</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>What is PixelFlow?</h2>
        <p>
          PixelFlow is an image hosting platform that lets you upload images and get fast, optimized delivery URLs.
          Think of it like a CDN for your images &mdash; you upload once, and PixelFlow handles compression,
          format conversion, and worldwide delivery so your images load quickly everywhere.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>How it works</h2>
        <p>
          The process is straightforward:
        </p>
        <ul>
          <li><strong>Upload</strong> &mdash; Drag and drop images or paste a URL. You can add tags, organize into folders, and set expiration dates.</li>
          <li><strong>Optimize</strong> &mdash; PixelFlow automatically compresses your images and generates modern formats like WebP and AVIF for smaller file sizes.</li>
          <li><strong>Deliver</strong> &mdash; Get a shareable URL for each image. The URL serves the optimized version, adapts to the viewer's browser, and scales to different screen sizes.</li>
        </ul>
        <p>
          Every image gets a unique URL like <code>/i/abc123</code>. You can use these URLs directly in websites,
          apps, emails, or share them anywhere. PixelFlow also supports query parameters for on-the-fly
          resizing &mdash; just add <code>?w=600</code> to get a 600px wide version.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Smart Compression</h3>
            <p>Images are automatically compressed without visible quality loss, saving storage and bandwidth.</p>
          </div>
          <div className="feature-card">
            <h3>Modern Formats</h3>
            <p>Generates AVIF and WebP versions alongside the original, so browsers always get the best format.</p>
          </div>
          <div className="feature-card">
            <h3>Responsive Sizing</h3>
            <p>One URL serves multiple sizes. Add <code>?w=300</code> or <code>?w=1200</code> for different dimensions.</p>
          </div>
          <div className="feature-card">
            <h3>Organization</h3>
            <p>Tag images, organize into folders, and search your library to find anything quickly.</p>
          </div>
          <div className="feature-card">
            <h3>API Access</h3>
            <p>Generate API keys to upload and manage images programmatically from your own apps and scripts.</p>
          </div>
          <div className="feature-card">
            <h3>Fast Delivery</h3>
            <p>Images are served from a global CDN with caching, so they load fast no matter where your users are.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Built with</h2>
        <p>
          PixelFlow is built with React and Vite on the frontend, and Express.js with MongoDB on the backend.
          Images are stored in Supabase Storage, cached with Upstash Redis, and served through an optimized
          delivery pipeline. The project is open source and designed to be self-hosted.
        </p>
      </div>
    </div>
  );
}
