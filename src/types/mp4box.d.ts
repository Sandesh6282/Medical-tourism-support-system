declare module 'mp4box' {
  export interface MP4MediaTrack {
    id: number;
    created: Date;
    modified: Date;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    language: string;
    nb_samples: number;
    video?: {
      width: number;
      height: number;
    };
    audio?: {
      sample_rate: number;
      channel_count: number;
      sample_size: number;
    };
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasMoov: boolean;
    tracks: MP4MediaTrack[];
    videoTracks: MP4MediaTrack[];
    audioTracks: MP4MediaTrack[];
  }

  export interface MP4Sample {
    number: number;
    track_id: number;
    description: unknown;
    is_rap: boolean;
    is_sync: boolean;
    dts: number;
    cts: number;
    duration: number;
    timescale: number;
    size: number;
    data: Uint8Array;
  }

  export interface TrackBox {
    mdia: {
      minf: {
        stbl: {
          stsd: {
            entries: Array<{
              avcC?: Box;
              hvcC?: Box;
              vpcC?: Box;
              av1C?: Box;
              [key: string]: unknown;
            }>;
          };
        };
      };
    };
  }

  export interface Box {
    type: string;
    size: number;
    hdr_size: number;
    start: number;
    write: (stream: DataStream) => void;
    [key: string]: unknown;
  }

  export class DataStream {
    static BIG_ENDIAN: boolean;
    static LITTLE_ENDIAN: boolean;
    buffer: ArrayBuffer;
    position: number;
    constructor(buffer?: ArrayBuffer, byteOffset?: number, endianness?: boolean);
    writeUint8(val: number): void;
    writeUint16(val: number): void;
    writeUint32(val: number): void;
  }

  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onSamples?: (id: number, user: unknown, samples: MP4Sample[]) => void;
    onError?: (e: string | Error) => void;
    appendBuffer(buffer: ArrayBuffer): number;
    flush(): void;
    start(): void;
    stop(): void;
    setExtractionOptions(id: number, user?: unknown, options?: { nbSamples?: number; rapAlignment?: boolean }): void;
    getTrackById(id: number): TrackBox;
  }

  export function createFile(keepMdatData?: boolean): MP4File;

  export default {
    createFile,
    DataStream,
  };
}
