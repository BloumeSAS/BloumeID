import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  BloumeID,
  OS_FONT_CANDIDATES,
  SDK_VERSION,
  computeAntiReplaySignature,
  generateNonce,
  hmacSha256Hex,
  sha256Hex,
  stableStringify,
} from "./index";
import { BloumeIDServer } from "./server";
import {
  collectAudio,
  collectCanvas,
  collectConnection,
  collectFonts,
  collectHardware,
  collectLanguages,
  collectMath,
  collectScreen,
  collectSpeech,
  collectStorage,
  collectTimezoneIntl,
  collectUserAgentData,
  collectWebGL,
  collectWebGPU,
  collectWebRTC,
} from "./collectors";
import { runAntiSpoofProbes } from "./probes";

function installFullBrowserMocks() {
  // Mock Canvas 2D and WebGL contexts on HTMLCanvasElement
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  );

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((contextId: string) => {
    if (contextId === "2d") {
      return {
        rect: vi.fn(),
        isPointInPath: vi.fn().mockReturnValue(false),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        textBaseline: "alphabetic",
        fillStyle: "#000",
        font: "14px Arial",
        globalCompositeOperation: "source-over",
      } as unknown as CanvasRenderingContext2D;
    }
    if (contextId === "webgl2" || contextId === "webgl") {
      return {
        VENDOR: 0x1f00,
        RENDERER: 0x1f01,
        VERSION: 0x1f02,
        SHADING_LANGUAGE_VERSION: 0x8b8c,
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        VERTEX_SHADER: 0x8b31,
        FRAGMENT_SHADER: 0x8b30,
        LOW_FLOAT: 0x8df0,
        MEDIUM_FLOAT: 0x8df1,
        HIGH_FLOAT: 0x8df2,
        LOW_INT: 0x8df3,
        MEDIUM_INT: 0x8df4,
        HIGH_INT: 0x8df5,
        getExtension: vi.fn((name: string) => {
          if (name === "WEBGL_debug_renderer_info") {
            return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
          }
          if (name === "EXT_texture_filter_anisotropic") {
            return { MAX_TEXTURE_MAX_ANISOTROPY_EXT: 0x84ff };
          }
          return null;
        }),
        getParameter: vi.fn((param: number) => {
          if (param === 0x9245) return "NVIDIA Corporation";
          if (param === 0x9246) return "NVIDIA RTX 4090";
          if (param === 0x0d33) return 16384;
          if (param === 0x0d3a) return [16384, 16384];
          if (param === 0x84ff) return 16;
          return "WebGL 2.0";
        }),
        getSupportedExtensions: vi.fn().mockReturnValue(["WEBGL_debug_renderer_info", "EXT_color_buffer_float"]),
        getShaderPrecisionFormat: vi.fn().mockReturnValue({
          rangeMin: 127,
          rangeMax: 127,
          precision: 23,
        }),
      } as unknown as WebGLRenderingContext;
    }
    return null;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext);

  // Mock OfflineAudioContext
  class MockOfflineAudioContext {
    public currentTime = 0;
    public sampleRate = 44100;
    public destination = { maxChannelCount: 2 };
    public createOscillator() {
      return {
        type: "triangle",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
      };
    }
    public createDynamicsCompressor() {
      return {
        threshold: { setValueAtTime: vi.fn() },
        knee: { setValueAtTime: vi.fn() },
        ratio: { setValueAtTime: vi.fn() },
        attack: { setValueAtTime: vi.fn() },
        release: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
      };
    }
    public async startRendering() {
      const arr = new Float32Array(5000);
      for (let i = 4500; i < 5000; i++) arr[i] = 0.012345;
      return {
        getChannelData: () => arr,
      };
    }
  }
  (window as unknown as Record<string, unknown>).OfflineAudioContext = MockOfflineAudioContext;

  // Mock WebGPU, userAgentData, connection, storage, permissions
  const nav = navigator as unknown as Record<string, unknown>;
  nav.gpu = {
    requestAdapter: vi.fn().mockResolvedValue({
      info: {
        vendor: "nvidia",
        architecture: "ada-lovelace",
        device: "rtx4090",
        description: "NVIDIA GeForce RTX 4090",
      },
      limits: {
        maxTextureDimension2D: 16384,
        maxBufferSize: 268435456,
        maxComputeWorkgroupSizeX: 1024,
      },
    }),
  };

  nav.userAgentData = {
    brands: [{ brand: "Chromium", version: "130" }],
    mobile: false,
    platform: "Windows",
    getHighEntropyValues: vi.fn().mockResolvedValue({
      architecture: "x86",
      bitness: "64",
      model: "",
      platformVersion: "15.0.0",
      fullVersionList: [{ brand: "Chromium", version: "130.0.6723.58" }],
    }),
  };

  nav.connection = {
    effectiveType: "4g",
    rtt: 50,
    downlink: 10,
    saveData: false,
  };

  nav.storage = {
    estimate: vi.fn().mockResolvedValue({ quota: 2000 * 1024 * 1024, usage: 1024 }),
  };

  nav.permissions = {
    query: vi.fn().mockResolvedValue({ state: "prompt" }),
  };

  (window as unknown as Record<string, unknown>).Notification = { permission: "default" };

  (window as unknown as Record<string, unknown>).speechSynthesis = {
    getVoices: vi.fn().mockReturnValue([
      { name: "Microsoft Hortense", lang: "fr-FR", localService: true, default: true },
    ]),
  };

  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("p3") || q.includes("dark") || q.includes("high"),
  }));

  // Mock RTCPeerConnection
  class MockRTCPeerConnection {
    public onicecandidate: ((e: { candidate: { candidate: string } | null }) => void) | null = null;
    public createDataChannel() {}
    public async createOffer() {
      return { sdp: "v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\n" };
    }
    public async setLocalDescription() {
      setTimeout(() => {
        this.onicecandidate?.({
          candidate: { candidate: "candidate:1 1 UDP 2122252543 192.168.1.45 54321 typ host" },
        });
        this.onicecandidate?.({
          candidate: { candidate: "candidate:2 1 UDP 1686052607 203.0.113.5 54322 typ srflx" },
        });
        this.onicecandidate?.({ candidate: null });
      }, 5);
    }
    public close() {}
  }
  (window as unknown as Record<string, unknown>).RTCPeerConnection = MockRTCPeerConnection;
}

describe("@bloumeid/sdk — Collectors, Anti-Spoof, Thumbmark API & Server Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installFullBrowserMocks();
  });

  it("instantiates with default and custom options", () => {
    const client = new BloumeID({
      apiKey: "bid_pub_test123",
      endpoint: "https://id.bloume.example/",
      options: { exclude: ["webrtc"], timeout: 4000, cacheLifetimeMs: 1000 },
    });
    expect(client.version).toBe(SDK_VERSION);
    expect(client.getOptions().apiKey).toBe("bid_pub_test123");
    expect(client.getOptions().endpoint).toBe("https://id.bloume.example");
    expect(client.getOptions().options.exclude).toEqual(["webrtc"]);

    client.setOption("timeout", 2500);
    expect(client.getOptions().options.timeout).toBe(2500);
  });

  it("computes deterministic SHA-256, HMAC-SHA256 and anti-replay signatures", () => {
    expect(sha256Hex("bloumeid")).toHaveLength(64);
    expect(sha256Hex("bloumeid")).toBe(sha256Hex("bloumeid"));
    expect(hmacSha256Hex("bid_pub_key", "payload")).toHaveLength(64);
    expect(hmacSha256Hex("k".repeat(90), "payload")).toHaveLength(64);

    const nonce = generateNonce(24);
    expect(nonce).toHaveLength(24);
    const sig1 = computeAntiReplaySignature("bid_pub_1", 1700000000000, nonce, "f_hash", "hw_hash");
    const sig2 = computeAntiReplaySignature("bid_pub_1", 1700000000000, nonce, "f_hash", "hw_hash");
    expect(sig1).toBe(sig2);
    expect(stableStringify({ b: 2, a: [1, { d: 4, c: 3 }] })).toBe('{"a":[1,{"c":3,"d":4}],"b":2}');
  });

  it("includes 60+ OS font candidates and collects all signal groups with rich browser APIs", async () => {
    expect(OS_FONT_CANDIDATES.length).toBeGreaterThanOrEqual(60);

    const canvas = collectCanvas();
    expect(canvas.hash).toHaveLength(64);
    expect(canvas.doubleRenderConsistent).toBe(true);

    const webgl = collectWebGL();
    expect(webgl.webgl2Available).toBe(true);
    expect(webgl.unmaskedRenderer).toBe("NVIDIA RTX 4090");
    expect(webgl.maxAnisotropy).toBe(16);
    expect(webgl.extensionsHash).toHaveLength(64);

    const webgpu = await collectWebGPU();
    expect(webgpu.available).toBe(true);
    expect(webgpu.vendor).toBe("nvidia");
    expect(webgpu.limitsHash).toHaveLength(64);

    const audio = await collectAudio();
    expect(audio.available).toBe(true);
    expect(audio.sampleHash).toHaveLength(64);
    expect(audio.sumValue).toBeGreaterThan(0);

    const hardware = collectHardware();
    expect(hardware.hardwareConcurrency).toBeGreaterThanOrEqual(1);

    const screen = collectScreen();
    expect(screen.colorGamut).toBe("p3");
    expect(screen.hdrSupported).toBe(true);

    const fonts = collectFonts();
    expect(fonts.hash).toHaveLength(64);

    const tz = collectTimezoneIntl();
    expect(tz.timezone.length).toBeGreaterThan(0);

    const langs = collectLanguages();
    expect(langs.languages.length).toBeGreaterThan(0);

    const uaData = await collectUserAgentData();
    expect(uaData.platform).toBe("Windows");
    expect(uaData.fullVersionListHash).toHaveLength(64);

    const storage = await collectStorage();
    expect(storage.quotaBytes).toBeGreaterThan(1000);

    const speech = collectSpeech();
    expect(speech.available).toBe(true);
    expect(speech.voiceCount).toBe(1);

    const math = collectMath();
    expect(math.constantsHash).toHaveLength(64);

    const webrtc = await collectWebRTC(80);
    expect(webrtc.available).toBe(true);
    expect(webrtc.localIpPresent).toBe(true);
    expect(webrtc.candidateTypes).toContain("host");
    expect(webrtc.candidateTypes).toContain("srflx");

    const conn = collectConnection();
    expect(conn.available).toBe(true);
    expect(conn.effectiveType).toBe("4g");

    const probes = await runAntiSpoofProbes({
      canvas,
      audio,
      hardware,
      webgl,
      languages: langs,
      storage,
    });
    expect(typeof probes.isBot).toBe("boolean");
    expect(typeof probes.isSpoofed).toBe("boolean");
  });

  it("handles fallback paths when WebGL, WebGPU, Audio, WebRTC, and Connection are unavailable", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    delete (window as unknown as Record<string, unknown>).OfflineAudioContext;
    delete (window as unknown as Record<string, unknown>).RTCPeerConnection;
    const nav = navigator as unknown as Record<string, unknown>;
    delete nav.gpu;
    delete nav.userAgentData;
    delete nav.connection;

    const canvas = collectCanvas();
    expect(canvas.winding).toBe(false);

    const webgl = collectWebGL();
    expect(webgl.webgl1Available).toBe(false);

    const webgpu = await collectWebGPU();
    expect(webgpu.available).toBe(false);

    const audio = await collectAudio();
    expect(audio.available).toBe(false);

    const ua = await collectUserAgentData();
    expect(ua.brands).toEqual([]);

    const webrtc = await collectWebRTC(20);
    expect(webrtc.available).toBe(false);

    const conn = collectConnection();
    expect(conn.available).toBe(false);
  });

  it("detects automation, webdriver, permission mismatch, worker mismatch and spoofing anomalies", async () => {
    const win = window as unknown as Record<string, unknown>;
    win.__playwright = true;
    win.Notification = { permission: "denied" };
    (navigator as unknown as Record<string, unknown>).webdriver = true;

    // Mock Worker to simulate main thread vs worker mismatch
    class MockWorker {
      public onmessage: ((e: MessageEvent) => void) | null = null;
      public onerror: (() => void) | null = null;
      public postMessage() {
        setTimeout(() => {
          this.onmessage?.({
            data: { ua: "SpoofedWorkerUA", platform: "Linux", hc: 99 },
          } as MessageEvent);
        }, 5);
      }
      public terminate() {}
    }
    win.Worker = MockWorker;
    URL.createObjectURL = vi.fn().mockReturnValue("blob:test");
    URL.revokeObjectURL = vi.fn();

    const baseAudio = await collectAudio();
    const baseStorage = await collectStorage();
    const canvas = { ...collectCanvas(), doubleRenderConsistent: false };
    const audio = { ...baseAudio, doubleRenderConsistent: false };
    const hardware = collectHardware();
    const webgl = { ...collectWebGL(), unmaskedRenderer: "Google SwiftShader" };
    const languages = { language: "fr-FR", languages: ["en-US"], consistentMainLanguage: false };
    const storage = { ...baseStorage, quotaBytes: 50 * 1024 * 1024 };

    const result = await runAntiSpoofProbes({
      canvas,
      audio,
      hardware,
      webgl,
      languages,
      storage,
    });

    expect(result.isBot).toBe(true);
    expect(result.webdriver).toBe(true);
    expect(result.permissionsInconsistent).toBe(true);
    expect(result.workerMismatch).toBe(true);
    expect(result.isSpoofed).toBe(true);
    expect(result.isIncognito).toBe(true);
    expect(result.canvasNoiseDetected).toBe(true);
    expect(result.audioNoiseDetected).toBe(true);
    expect(result.automationArtifacts).toContain("__playwright");

    delete win.__playwright;
    delete win.Worker;
    (navigator as unknown as Record<string, unknown>).webdriver = false;
  });

  it("runs ThumbmarkJS Pro compatible get(), getFingerprint(), getFingerprintData() and exclusions", async () => {
    const sdkFull = new BloumeID({
      options: { cacheLifetimeMs: 5000 },
    });
    const fullRes = await sdkFull.get();
    expect(fullRes.thumbmark).toHaveLength(64);

    const sdkExcluded = new BloumeID({
      options: {
        exclude: [
          "webrtc",
          "canvas",
          "webgl",
          "webgpu",
          "audio",
          "hardware",
          "screen",
          "fonts",
          "timezone",
          "languages",
          "userAgentData",
          "storage",
          "speech",
          "math",
          "connection",
          "antiSpoof",
        ],
        cacheLifetimeMs: 5000,
      },
    });

    const hash = await sdkExcluded.getFingerprint();
    expect(hash).toHaveLength(64);

    const res1 = await sdkExcluded.get();
    expect(res1.visitorId).toMatch(/^vis_/);
    expect(res1.requestId).toMatch(/^req_/);

    const res2 = await sdkExcluded.get();
    expect(res2.requestId).toBe(res1.requestId);
  });

  it("sends anti-replay signed payload to endpoint when apiKey and endpoint are configured", async () => {
    const mockServerResult = {
      visitorId: "vis_72819283719283712",
      thumbmark: "a".repeat(64),
      hardwareHash: "b".repeat(64),
      requestId: "req_72819283719283713",
      confidence: { score: 0.99 },
      components: {} as never,
      info: {
        dangerLevel: 0,
        isBot: false,
        isSpoofed: false,
        isIncognito: false,
        isVpn: false,
        isTor: false,
        isDatacenter: false,
        isProxy: false,
        crossBrowserMatched: false,
        durationMs: 12,
        collectorCount: 48,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockServerResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const sdk = new BloumeID({
      apiKey: "bid_pub_livekey",
      endpoint: "https://bloumeid.internal",
      options: { exclude: ["webrtc"], cacheLifetimeMs: 1000 },
    });

    const res = await sdk.get();
    expect(res.visitorId).toBe("vis_72819283719283712");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it("validates BloumeIDServer verifyRequest and getVisitor methods", async () => {
    expect(() => new BloumeIDServer({ secretKey: "invalid" })).toThrow();

    const server = new BloumeIDServer({
      secretKey: "bid_sec_valid_secret_key",
      endpoint: "https://bloumeid.internal/",
    });

    await expect(server.verifyRequest("bad_id")).rejects.toThrow();
    await expect(server.getVisitor("bad_vis")).rejects.toThrow();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requestId: "req_123",
            visitorId: "vis_456",
            siteId: "site_789",
            thumbmark: "a".repeat(64),
            hardwareHash: "b".repeat(64),
            dangerLevel: 1,
            confidence: 0.99,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            visitorId: "vis_456",
            siteId: "site_789",
            hardwareHash: "b".repeat(64),
            visitCount: 4,
            maxDangerLevel: 1,
            tags: ["verified"],
            notes: null,
            recentEvents: [],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
      );

    const verified = await server.verifyRequest("req_123");
    expect(verified.visitorId).toBe("vis_456");

    const visitor = await server.getVisitor("vis_456");
    expect(visitor.visitCount).toBe(4);

    await expect(server.verifyRequest("req_404")).rejects.toThrow("Not found");
    fetchSpy.mockRestore();
  });
});
