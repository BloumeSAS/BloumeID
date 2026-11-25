export const SDK_VERSION = "0.1.0";

export interface BloumeIDConfig {
  apiKey?: string;
  endpoint?: string;
  options?: {
    exclude?: string[];
    timeout?: number;
  };
}

export class BloumeID {
  public readonly version = SDK_VERSION;
  private config: BloumeIDConfig;

  constructor(config: BloumeIDConfig = {}) {
    this.config = config;
  }

  public getOptions(): BloumeIDConfig {
    return this.config;
  }
}

export default BloumeID;
