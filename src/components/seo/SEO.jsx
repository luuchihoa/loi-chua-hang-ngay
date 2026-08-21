import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'Lời Chúa Mỗi Ngày – Phụng vụ và Kinh Thánh Công giáo';
const DEFAULT_DESC = 'Đọc, nghe và sống Lời Chúa mỗi ngày với bài đọc phụng vụ cùng Kinh Thánh Công giáo Việt Nam.';
const DOMAIN = 'https://loichuamoingay.org';
const DEFAULT_IMAGE = `${DOMAIN}/logo_loi_chua_moi_ngay.png`;

export default function SEO({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  type = 'website',
  robots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  canonical = null,
  jsonLd = null,
  speakableSelectors = ['.liturgy-gospel-text', '.liturgy-homily-text'],
  audioData = null
}) {
  const location = useLocation();
  const rawPath = location.pathname.endsWith('/') && location.pathname !== '/'
    ? location.pathname.slice(0, -1)
    : location.pathname;
  const canonicalUrl = canonical || `${DOMAIN}${rawPath}`;
  const fullTitle = title ? `${title} | Lời Chúa Mỗi Ngày` : DEFAULT_TITLE;

  useEffect(() => {
    // 1. Cập nhật Title
    document.title = fullTitle;

    // Helper update / create meta
    const setMetaTag = (attr, attrValue, content) => {
      let element = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Cập nhật Meta Description, Robots & Open Graph
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robots);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', image);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', 'Lời Chúa Mỗi Ngày');

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', image);

    // 3. Cập nhật Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // 4. Hợp nhất Schema JSON-LD đa tầng (WebSite, Sitelinks Search Box, Speakable, Audio, FAQ)
    const baseSchemas = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Lời Chúa Mỗi Ngày",
        "url": DOMAIN,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${DOMAIN}/bible?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": fullTitle,
        "url": canonicalUrl,
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": speakableSelectors
        }
      }
    ];

    if (audioData) {
      baseSchemas.push({
        "@context": "https://schema.org",
        "@type": "AudioObject",
        "name": audioData.name || fullTitle,
        "description": description,
        "contentUrl": audioData.url,
        "encodingFormat": "audio/mpeg",
        "uploadDate": new Date().toISOString()
      });
    }

    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        baseSchemas.push(...jsonLd);
      } else if (jsonLd['@graph']) {
        baseSchemas.push(...jsonLd['@graph']);
      } else {
        baseSchemas.push(jsonLd);
      }
    }

    const scriptId = 'json-ld-schema';
    let scriptJsonLd = document.getElementById(scriptId);
    if (!scriptJsonLd) {
      scriptJsonLd = document.createElement('script');
      scriptJsonLd.id = scriptId;
      scriptJsonLd.type = 'application/ld+json';
      document.head.appendChild(scriptJsonLd);
    }
    scriptJsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": baseSchemas
    });

  }, [fullTitle, description, canonicalUrl, image, type, jsonLd, speakableSelectors, audioData]);

  return null;
}
