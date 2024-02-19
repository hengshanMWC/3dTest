import { dateEnUS, dateZhCN, enUS, zhCN } from 'naive-ui'
import { HOME_NAME } from './router'

export const HOME_PAGE_NAME = HOME_NAME

export const LOCALES_ENUM = {
  EN_US: 'en-US',
  ZH_CN: 'zh-CN',
}

export const NAIVE_UI_LOCALES = {
  [LOCALES_ENUM.EN_US]: {
    locale: enUS,
    dateLocale: dateEnUS,
  },
  [LOCALES_ENUM.ZH_CN]: {
    locale: zhCN,
    dateLocale: dateZhCN,
  },
}
export const LEGAL_LOCALES = Object.keys(LOCALES_ENUM).map(
  key => LOCALES_ENUM[key],
)
