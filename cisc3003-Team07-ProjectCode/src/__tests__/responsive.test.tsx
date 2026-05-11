/* eslint-disable testing-library/no-render-in-lifecycle */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { installMatchMediaMock, setViewportWidth } from '../testUtils/matchMedia';

installMatchMediaMock();

// A tiny component to showcase the testable responsive design pattern used
// across the iSuperviz pages: state-driven breakpoint logic.
function ResponsiveCard() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 576);
  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 576);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  return (
    <div data-testid="responsive-card">
      {isMobile ? (
        <span data-testid="mobile-view">Mobile view</span>
      ) : (
        <span data-testid="desktop-view">Desktop view</span>
      )}
    </div>
  );
}

describe('Testable responsive design', () => {
  test('renders desktop view at 1440px', () => {
    setViewportWidth(1440);
    render(<ResponsiveCard />);
    expect(screen.getByTestId('desktop-view')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-view')).not.toBeInTheDocument();
  });

  test('renders mobile view at 360px', () => {
    setViewportWidth(360);
    render(<ResponsiveCard />);
    expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
  });

  test('renders desktop view at 768px (tablet boundary)', () => {
    setViewportWidth(768);
    render(<ResponsiveCard />);
    // 768 > 576 so non-mobile layout is expected
    expect(screen.getByTestId('desktop-view')).toBeInTheDocument();
  });
});
