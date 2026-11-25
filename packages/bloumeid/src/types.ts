export type CollectorName =
  | "canvas"
  | "webgl"
  | "webgpu"
  | "audio"
  | "hardware"
  | "screen"
  | "fonts"
  | "timezone"
  | "intl"
  | "languages"
  | "userAgentData"
  | "storage"
  | "speech"
  | "math"
  | "webrtc"
  | "connection"
  | "media"
  | "permissions"
  | "antiSpoof"
  | "privateMode";

export interface BloumeIDOptions {
  exclude?: CollectorName[];
  timeout?: number;
  cacheLifetimeMs?: number;
  includeRawComponents?: boolean;
}

export interface BloumeIDInitConfig {
  apiKey?: string;
  endpoint?: string;
  options?: BloumeIDOptions;
}

export interface CanvasComponent {
  hash: string;
  winding: boolean;
  doubleRenderConsistent: boolean;
  geometryHash: string;
  textHash: string;
}

export interface WebGLComponent {
  webgl1Available: boolean;
  webgl2Available: boolean;
  vendor: string;
  renderer: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  version: string;
  shadingLanguageVersion: string;
  extensionsCount: number;
  extensionsHash: string;
  maxTextureSize: number;
  maxViewportDims: [number, number];
  maxAnisotropy: number;
  shaderPrecisionHash: string;
}

export interface WebGPUComponent {
  available: boolean;
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  limitsHash: string;
}

export interface AudioComponent {
  available: boolean;
  sampleHash: string;
  sumValue: number;
  sampleRate: number;
  maxChannelCount: number;
  doubleRenderConsistent: boolean;
}

export interface HardwareComponent {
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  platform: string;
  vendor: string;
  oscpu: string;
  pdfViewerEnabled: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  architectureHint: string;
}

export interface ScreenComponent {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
  orientationType: string;
  hdrSupported: boolean;
  colorGamut: "rec2020" | "p3" | "srgb" | "unknown";
  forcedColors: boolean;
  prefersDarkScheme: boolean;
  prefersReducedMotion: boolean;
  touchSupport: boolean;
}

export interface FontsComponent {
  detected: string[];
  count: number;
  hash: string;
}

export interface TimezoneIntlComponent {
  timezone: string;
  timezoneOffsetMinutes: number;
  locale: string;
  calendar: string;
  numberingSystem: string;
  dateTimeFormatHash: string;
  numberFormatSymbol: string;
  pluralCategories: string[];
}

export interface LanguagesComponent {
  language: string;
  languages: string[];
  consistentMainLanguage: boolean;
}

export interface UserAgentDataComponent {
  userAgent: string;
  brands: Array<{ brand: string; version: string }>;
  mobile: boolean;
  platform: string;
  architecture: string;
  bitness: string;
  model: string;
  platformVersion: string;
  fullVersionListHash: string;
}

export interface StorageComponent {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  cachesApi: boolean;
  serviceWorker: boolean;
  quotaBytes: number;
  usageBytes: number;
}

export interface SpeechComponent {
  available: boolean;
  voiceCount: number;
  defaultVoice: string;
  voicesHash: string;
}

export interface MathComponent {
  engineHint: "V8" | "SpiderMonkey" | "JavaScriptCore" | "Unknown";
  constantsHash: string;
  acos: number;
  acosh: number;
  asinh: number;
  atanh: number;
  cbrt: number;
  cosh: number;
  expm1: number;
  log1p: number;
  sinh: number;
  tanh: number;
  powPi: number;
}

export interface WebRTCComponent {
  available: boolean;
  candidateTypes: string[];
  localIpPresent: boolean;
  sdpFeedbackHash: string;
}

export interface ConnectionComponent {
  available: boolean;
  effectiveType: string;
  rtt: number;
  downlink: number;
  saveData: boolean;
}

export interface AntiSpoofComponent {
  isBot: boolean;
  isSpoofed: boolean;
  isIncognito: boolean;
  webdriver: boolean;
  automationArtifacts: string[];
  chromeObjectAnomaly: boolean;
  permissionsInconsistent: boolean;
  workerMismatch: boolean;
  canvasNoiseDetected: boolean;
  audioNoiseDetected: boolean;
  reasons: string[];
}

export interface FingerprintComponents {
  canvas: CanvasComponent;
  webgl: WebGLComponent;
  webgpu: WebGPUComponent;
  audio: AudioComponent;
  hardware: HardwareComponent;
  screen: ScreenComponent;
  fonts: FontsComponent;
  timezoneIntl: TimezoneIntlComponent;
  languages: LanguagesComponent;
  userAgentData: UserAgentDataComponent;
  storage: StorageComponent;
  speech: SpeechComponent;
  math: MathComponent;
  webrtc: WebRTCComponent;
  connection: ConnectionComponent;
  antiSpoof: AntiSpoofComponent;
}

export interface FingerprintThreatInfo {
  dangerLevel: number;
  isBot: boolean;
  isSpoofed: boolean;
  isIncognito: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  isProxy: boolean;
  crossBrowserMatched: boolean;
  ipAddress?: string;
  asnNumber?: number | null;
  asnOrg?: string | null;
  country?: string | null;
  city?: string | null;
  durationMs: number;
  collectorCount: number;
}

export interface BloumeIDResult {
  visitorId: string;
  thumbmark: string;
  hardwareHash: string;
  requestId: string;
  confidence: {
    score: number;
    comment?: string;
  };
  components: FingerprintComponents;
  info: FingerprintThreatInfo;
}

export interface AntiReplayEnvelope {
  timestamp: number;
  nonce: string;
  signature: string;
  fullHash: string;
  hardwareHash: string;
  durationMs: number;
  components: FingerprintComponents;
}
