import sidebar from './sidebar'
import head from './head'
import nav from './nav'
import markdown from './markdown'
import lang from './lang'
const config = {
  title: 'Vue DevUI',
  description: 'Vue DevUI 组件库',
  head,
  markdown,
  locales: {
    '/': {
      lang: 'zh-CN',
      label: '简体中文'
    },
    '/en-US': {
      lang: 'en-US',
      label: 'English'
    }
  },
  themeConfig: {
    sidebar,
    nav,
    demoblock: lang,
    logo: '../../assets/logo.svg',
    locales: {
      '/': {
        lang: 'zh-CN',
        label: '简体中文'
      },
      '/en-US': {
        lang: 'en-US',
        label: 'English'
      }
    }
  }
}

export default config
