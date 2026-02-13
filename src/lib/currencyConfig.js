export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar', flag: '\u{1F1FA}\u{1F1F8}' },
  EUR: { code: 'EUR', symbol: '\u20AC', locale: 'de-DE', name: 'Euro', flag: '\u{1F1EA}\u{1F1FA}' },
  GBP: { code: 'GBP', symbol: '\u00A3', locale: 'en-GB', name: 'British Pound', flag: '\u{1F1EC}\u{1F1E7}' },
  JPY: { code: 'JPY', symbol: '\u00A5', locale: 'ja-JP', name: 'Japanese Yen', flag: '\u{1F1EF}\u{1F1F5}', decimals: 0 },
  CAD: { code: 'CAD', symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar', flag: '\u{1F1E8}\u{1F1E6}' },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar', flag: '\u{1F1E6}\u{1F1FA}' },
  CHF: { code: 'CHF', symbol: 'CHF', locale: 'de-CH', name: 'Swiss Franc', flag: '\u{1F1E8}\u{1F1ED}' },
  CNY: { code: 'CNY', symbol: '\u00A5', locale: 'zh-CN', name: 'Chinese Yuan', flag: '\u{1F1E8}\u{1F1F3}' },
  INR: { code: 'INR', symbol: '\u20B9', locale: 'en-IN', name: 'Indian Rupee', flag: '\u{1F1EE}\u{1F1F3}' },
  BRL: { code: 'BRL', symbol: 'R$', locale: 'pt-BR', name: 'Brazilian Real', flag: '\u{1F1E7}\u{1F1F7}' },
  KRW: { code: 'KRW', symbol: '\u20A9', locale: 'ko-KR', name: 'South Korean Won', flag: '\u{1F1F0}\u{1F1F7}', decimals: 0 },
  RUB: { code: 'RUB', symbol: '\u20BD', locale: 'ru-RU', name: 'Russian Ruble', flag: '\u{1F1F7}\u{1F1FA}' },
}

export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '\u{1F1EC}\u{1F1E7}', dir: 'ltr' },
  fr: { code: 'fr', name: 'French', nativeName: 'Fran\u00E7ais', flag: '\u{1F1EB}\u{1F1F7}', dir: 'ltr' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}', dir: 'ltr' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}', dir: 'ltr' },
  hi: { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}', dir: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\u{1F1F8}\u{1F1E6}', dir: 'rtl' },
  ru: { code: 'ru', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}', dir: 'ltr' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Portugu\u00EAs', flag: '\u{1F1E7}\u{1F1F7}', dir: 'ltr' },
}

export const CURRENCY_LIST = Object.values(CURRENCIES)
export const LANGUAGE_LIST = Object.values(LANGUAGES)
