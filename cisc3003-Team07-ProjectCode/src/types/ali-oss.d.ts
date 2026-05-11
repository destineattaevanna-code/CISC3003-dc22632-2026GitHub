declare module 'ali-oss' {
  interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    stsToken?: string;
    bucket?: string;
    [key: string]: any;
  }

  interface SignatureUrlOptions {
    expires?: number;
    [key: string]: any;
  }

  class OSS {
    constructor(options: OSSOptions);
    signatureUrl(name: string, options?: SignatureUrlOptions): string;
    get(name: string, options?: any): Promise<any>;
    head(name: string, options?: any): Promise<any>;
  }

  export = OSS;
}
