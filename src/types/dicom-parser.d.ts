declare module "dicom-parser" {
  export interface DicomElement {
    tag: string;
    vr?: string;
    length: number;
    dataOffset: number;
  }

  export interface DataSet {
    byteArray: Uint8Array;
    elements: Record<string, DicomElement>;
    string(tag: string): string | undefined;
    text(tag: string): string | undefined;
    uint16(tag: string): number | undefined;
    int16(tag: string): number | undefined;
    uint32(tag: string): number | undefined;
    int32(tag: string): number | undefined;
    float(tag: string): number | undefined;
    double(tag: string): number | undefined;
    numStringValues(tag: string): number;
  }

  export interface ParseOptions {
    untilTag?: string;
    maxBytesToRead?: number;
  }

  export function parseDicom(byteArray: Uint8Array, options?: ParseOptions): DataSet;

  export function explicitElementToString(dataSet: DataSet, element: DicomElement): string;
}
