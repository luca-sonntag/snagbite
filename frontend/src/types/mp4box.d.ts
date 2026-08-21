declare module 'mp4box' {
  export interface MP4MediaTrack {
    id: number;
    codec: string;
    duration: number;
    timescale: number;
    nb_samples?: number;
    video?: {
      width: number;
      height: number;
    };
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    videoTracks: MP4MediaTrack[];
    audioTracks: MP4MediaTrack[];
  }

  export interface MP4Sample {
    track_id: number;
    description: any;
    is_sync: boolean;
    dts: number;
    cts: number;
    duration: number;
    timescale: number;
    data: ArrayBuffer;
  }

  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onError?: (e: string) => void;
    onSamples?: (id: number, user: any, samples: MP4Sample[]) => void;
    appendBuffer(data: ArrayBuffer & { fileStart?: number }): number;
    flush(): void;
    setExtractionOptions(id: number, user?: any, options?: { nbSamples?: number; rapAlignment?: boolean }): void;
    start(): void;
    stop(): void;
    getTrackById(id: number): any;
  }

  export class DataStream {
    static BIG_ENDIAN: boolean;
    buffer: ArrayBuffer;
    constructor(buffer?: ArrayBuffer, offset?: number, endianness?: boolean);
  }

  export function createFile(): MP4File;
}
