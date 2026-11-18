import type { Language } from '../i18n'

export type WeatherMessage =
  | 'city' | 'searchCity' | 'useLocation' | 'cityResults' | 'unit' | 'celsius' | 'fahrenheit' | 'showForecast'
  | 'privacyHint' | 'permissionDenied' | 'searchTooShort' | 'noCities' | 'searchFailed' | 'currentLocation'
  | 'locationUnavailable' | 'locationFailed' | 'loading' | 'refresh' | 'offline' | 'updatedAt' | 'tapToLoad'
  | 'chooseLocation' | 'refreshFailed' | 'title' | 'locationDenied' | 'locationTimeout' | 'allowAccess' | 'needsAccess'
  | 'setLocation' | 'locating' | 'searching' | 'citySaved' | 'locationSaved' | 'cityPlaceholder' | 'stale' | 'allowSearch'

export const weatherMessages: Record<Language, Record<WeatherMessage, string>> = {
  en: {
    title: 'Weather', city: 'City', searchCity: 'Search cities', useLocation: 'Use current location', cityResults: 'City search results',
    unit: 'Temperature unit', celsius: 'Celsius', fahrenheit: 'Fahrenheit', showForecast: 'Show 3-day forecast',
    privacyHint: 'Weather comes from Open-Meteo, a free, open-source service. After you pick a city, the widget loads it when a new tab opens and refreshes every 30 minutes. Only the city name and its coordinates are sent. Your location is read only when you click Use current location.',
    permissionDenied: 'Network access was not granted.', searchTooShort: 'Enter at least two characters.', noCities: 'No matching cities found.',
    searchFailed: 'City search could not be completed.', currentLocation: 'Current location', locationUnavailable: 'Your device could not report a location (on Windows, location services may be off). Search for your city instead.',
    locationFailed: 'Could not get your location. Search for your city instead.', loading: 'Loading…', refresh: 'Update weather',
    offline: 'Offline · showing saved weather', updatedAt: 'Updated at {time}', tapToLoad: 'Weather is loading…',
    chooseLocation: 'Pick a city to see the weather.', refreshFailed: 'Weather could not be loaded. Showing nothing new; try again in a moment.',
    locationDenied: 'The browser blocked location access. Allow location for this page in the browser\'s site permissions, or search for your city.',
    locationTimeout: 'Finding your location took too long. Try again, or search for your city.',
    allowAccess: 'Allow weather', needsAccess: 'Promptab needs permission to contact Open-Meteo before it can load weather.',
    setLocation: 'Choose city', locating: 'Finding your location…', searching: 'Searching…',
    citySaved: 'Saved {city}. The weather widget now loads it automatically.', locationSaved: 'Location saved. The weather widget now loads it automatically.',
    cityPlaceholder: 'Type a city, e.g. London',
    allowSearch: 'Allow city search (asks once)', stale: 'Saved {time} · updating',
  },
  'zh-CN': {
    title: '天气', city: '城市', searchCity: '搜索城市', useLocation: '使用当前位置', cityResults: '城市搜索结果',
    unit: '温度单位', celsius: '摄氏度', fahrenheit: '华氏度', showForecast: '显示未来三天',
    privacyHint: '天气来自免费开源的 Open-Meteo。选好城市后，每次打开新标签页会自动加载，并每 30 分钟更新一次。只会发送城市名称和坐标；只有点击“使用当前位置”时才会读取定位。',
    permissionDenied: '未获得网络访问权限。', searchTooShort: '请输入至少两个字符。', noCities: '没有找到匹配的城市。',
    searchFailed: '无法完成城市搜索。', currentLocation: '当前位置', locationUnavailable: '设备无法提供位置（例如 Windows 的定位服务已关闭）。请直接搜索城市。',
    locationFailed: '无法获取位置，请直接搜索城市。', loading: '正在加载…', refresh: '更新天气',
    offline: '离线 · 显示已保存的天气', updatedAt: '更新时间：{time}', tapToLoad: '正在加载天气…',
    chooseLocation: '选择城市后即可显示天气。', refreshFailed: '无法加载天气，请稍后重试。',
    locationDenied: '浏览器拒绝了定位。可以在浏览器的网站权限里允许此页面使用位置，或直接搜索城市。',
    locationTimeout: '定位超时。请重试，或直接搜索城市。',
    allowAccess: '允许加载天气', needsAccess: '需要先允许 Promptab 访问 Open-Meteo，才能加载天气。',
    setLocation: '选择城市', locating: '正在定位…', searching: '正在搜索…',
    citySaved: '已保存「{city}」，天气组件会自动加载。', locationSaved: '已保存当前位置，天气组件会自动加载。',
    cityPlaceholder: '输入城市，例如：北京',
    allowSearch: '允许搜索城市（只需一次）', stale: '{time} 的数据 · 正在更新',
  },
}

export function weatherText(language: Language, key: WeatherMessage, params?: Record<string, string | number>) {
  return weatherMessages[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => params && name in params ? String(params[name]) : placeholder)
}
