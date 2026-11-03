import type { Language } from '../i18n'

export type WeatherMessage =
  | 'city' | 'searchCity' | 'useLocation' | 'cityResults' | 'unit' | 'celsius' | 'fahrenheit' | 'showForecast'
  | 'privacyHint' | 'permissionDenied' | 'searchTooShort' | 'noCities' | 'searchFailed' | 'currentLocation'
  | 'locationUnavailable' | 'locationFailed' | 'loading' | 'refresh' | 'offline' | 'updatedAt' | 'tapToLoad'
  | 'chooseLocation' | 'refreshFailed' | 'title'

export const weatherMessages: Record<Language, Record<WeatherMessage, string>> = {
  en: {
    title: 'Weather', city: 'City', searchCity: 'Search cities', useLocation: 'Use current location', cityResults: 'City search results',
    unit: 'Temperature unit', celsius: 'Celsius', fahrenheit: 'Fahrenheit', showForecast: 'Show 3-day forecast',
    privacyHint: 'Weather loads only when you ask. Your city or coordinates go to Open-Meteo. Location is requested only after you click Use current location.',
    permissionDenied: 'Network access was not granted.', searchTooShort: 'Enter at least two characters.', noCities: 'No matching cities found.',
    searchFailed: 'City search could not be completed.', currentLocation: 'Current location', locationUnavailable: 'Location is unavailable in this browser.',
    locationFailed: 'Could not get your location. Check browser location permission.', loading: 'Loading…', refresh: 'Update weather',
    offline: 'Offline · showing saved weather', updatedAt: 'Updated at {time}', tapToLoad: 'Choose a city, then update to load weather.',
    chooseLocation: 'Choose a city or use your current location in widget settings.', refreshFailed: 'Weather could not be loaded. Try again later.',
  },
  'zh-CN': {
    title: '天气', city: '城市', searchCity: '搜索城市', useLocation: '使用当前位置', cityResults: '城市搜索结果',
    unit: '温度单位', celsius: '摄氏度', fahrenheit: '华氏度', showForecast: '显示未来三天',
    privacyHint: '仅在你主动操作时加载天气。所选城市或坐标会发送到 Open-Meteo；只有点击“使用当前位置”后才会请求定位。',
    permissionDenied: '未获得网络访问权限。', searchTooShort: '请输入至少两个字符。', noCities: '没有找到匹配的城市。',
    searchFailed: '无法完成城市搜索。', currentLocation: '当前位置', locationUnavailable: '此浏览器无法使用定位功能。',
    locationFailed: '无法获取位置，请检查浏览器定位权限。', loading: '正在加载…', refresh: '更新天气',
    offline: '离线 · 显示已保存的天气', updatedAt: '更新时间：{time}', tapToLoad: '选择城市后，点击更新以加载天气。',
    chooseLocation: '请在组件设置中选择城市或使用当前位置。', refreshFailed: '无法加载天气，请稍后重试。',
  },
}

export function weatherText(language: Language, key: WeatherMessage, params?: Record<string, string | number>) {
  return weatherMessages[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => params && name in params ? String(params[name]) : placeholder)
}
