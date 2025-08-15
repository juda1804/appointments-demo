/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeDisabled(): R;
      toHaveValue(value: string | number | string[]): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveFocus(): R;
      toHaveClass(...classNames: string[]): R;
      toHaveStyle(css: string | object): R;
      toContainElement(element: HTMLElement | null): R;
    }
  }
}

export {};