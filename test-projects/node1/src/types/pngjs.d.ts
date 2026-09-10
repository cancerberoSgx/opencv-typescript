declare module "pngjs" {
  import { Duplex } from "node:stream";

  export interface PNGOptions {
    width?: number;
    height?: number;
    fill?: boolean;
    filterType?: number | number[];
    colorType?: number;
    inputColorType?: number;
    inputHasAlpha?: boolean;
    bitDepth?: number;
    checkCRC?: boolean;
    deflateChunkSize?: number;
    deflateLevel?: number;
    deflateStrategy?: number;
    deflateFactory?: unknown;
    skipRescale?: boolean;
  }

  export class PNG extends Duplex {
    static sync: {
      read(buffer: Buffer, options?: PNGOptions): PNG;
      write(png: PNG, options?: PNGOptions): Buffer;
    };

    constructor(options?: PNGOptions);

    width: number;
    height: number;
    data: Buffer;
    gamma: number;

    parse(data: Buffer, callback?: (error: Error | null, data: PNG) => void): PNG;
    pack(): this;
    bitblt(
      dst: PNG,
      srcX: number,
      srcY: number,
      width: number,
      height: number,
      deltaX: number,
      deltaY: number
    ): this;
  }
}
