import MarkdownIt from 'markdown-it'
import xss from 'xss'

export const configuredXss = new xss.FilterXSS({
  whiteList: {
    ...xss.whiteList,
    summary: [],
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
    kbd: ['id'],
    input: ['checked', 'disabled', 'type'],
    iframe: ['width', 'height', 'allowfullscreen', 'frameborder', 'start', 'end'],
    img: [...xss.whiteList.img, 'style'],
    a: [...xss.whiteList.a, 'rel'],
  },
  css: {
    whiteList: {
      'image-rendering': /^pixelated$/,
    },
  },
  onIgnoreTagAttr: (tag, name, value) => {
    // Allow iframes from acceptable sources
    if (tag === 'iframe' && name === 'src') {
      const allowedSources = [
        {
          regex:
            /^https?:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/[a-zA-Z0-9_-]{11}(\?&autoplay=[0-1]{1})?$/,
          remove: ['&autoplay=1'], // Prevents autoplay
        },
      ]

      for (const source of allowedSources) {
        if (source.regex.test(value)) {
          for (const remove of source.remove) {
            value = value.replace(remove, '')
          }
          return name + '="' + xss.escapeAttrValue(value) + '"'
        }
      }
    }

    // For Highlight.JS
    if (
      name === 'class' &&
      ['pre', 'code', 'span'].includes(tag) &&
      (value.startsWith('hljs-') || value.startsWith('language-'))
    ) {
      return name + '="' + xss.escapeAttrValue(value) + '"'
    }
  },
})

export const md = (options = {}) => {
  const md = new MarkdownIt('default', {
    html: true,
    linkify: true,
    breaks: false,
    ...options,
  })

  const defaultLinkOpenRenderer =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options)
    }

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    tokens[idx].attrJoin('rel', 'noopener noreferrer ugc')

    return defaultLinkOpenRenderer(tokens, idx, options, env, self)
  }

  const defaultImageRenderer =
    md.renderer.rules.image ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options)
    }

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx]
    const index = token.attrIndex('src')

    if (index !== -1) {
      const src = token.attrs[index][1]

      const url = new URL(src)
      const allowedHostnames = [
        'i.imgur.com',
        'cdn-raw.modrinth.com',
        'cdn.modrinth.com',
        'raw.githubusercontent.com',
      ]

      if (!allowedHostnames.includes(url.hostname)) {
        token.attrs[index][1] = `//wsrv.nl/?url=${src}`
      }
    }

    return defaultImageRenderer(tokens, idx, options, env, self)
  }

  return md
}

export const renderString = (string) => configuredXss.process(md().render(string))