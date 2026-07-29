import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loader from '@/components/Shared/Loader';

describe('Loader', () => {
  it('renders a loading indicator image', () => {
    render(<Loader />);
    const image = screen.getByAltText('loader');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/assets/images/loader.svg');
  });
});
