// jsdom doesn't implement matchMedia. Several Ant Design components rely on it.
// This helper lets tests override viewport width and emit matchMedia events.
export type MatchMediaStub = (query: string) => boolean;

export function installMatchMediaMock(matcher: MatchMediaStub = () => false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: matcher(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

export function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}
