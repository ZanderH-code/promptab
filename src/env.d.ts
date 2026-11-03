/// <reference types="vite/client" />
declare const __WEB_BUILD__: boolean
interface Window { chrome?: import('./platform/extension').ExtensionApi; browser?: import('./platform/extension').ExtensionApi }
