declare module 'react-error-overlay' {
  // CRA dev overlay uses this module at runtime; we only need minimal typing.
  export function stopReportingRuntimeErrors(): void;
  export function startReportingRuntimeErrors(options?: any): void;
  export function dismissRuntimeErrors(): void;
  export function reportRuntimeError(error: any): void;
}

