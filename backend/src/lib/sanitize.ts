import sanitizeHtml from 'sanitize-html';

const baseOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'h5', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup', 'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'video', 'source', 'audio',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    video: ['src', 'controls', 'width', 'poster', 'preload'],
    source: ['src', 'type'],
    audio: ['src', 'controls'],
    span: ['class'],
    div: ['class'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  enforceHtmlBoundary: true,
  disallowedTagsMode: 'discard',
};

/** Sanitises rich text submitted by administrators before it is stored. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', {
    ...baseOptions,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: attribs.loading || 'lazy', alt: attribs.alt ?? '' },
      }),
    },
  });
}

/** Strips every tag — used for plain-text fields such as descriptions and summaries. */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value ?? '', { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

/** Allows a small inline subset (bold/italic/links) for short descriptive fields. */
export function sanitizeInline(html: string): string {
  return sanitizeHtml(html ?? '', {
    allowedTags: ['b', 'strong', 'i', 'em', 'a', 'code', 'br'],
    allowedAttributes: { a: ['href', 'title', 'rel', 'target'] },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
