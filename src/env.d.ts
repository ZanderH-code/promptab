/// <reference types="vite/client" />
interface Window { chrome?: import('./platform/extension').ExtensionApi; browser?: import('./platform/extension').ExtensionApi }
