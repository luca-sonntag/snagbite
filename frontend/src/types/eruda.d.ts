declare module 'eruda' {
  export interface InitOptions {
    container?: HTMLElement;
    tool?: string[];
    autoScale?: boolean;
    useShadowDom?: boolean;
    inline?: boolean;
    defaults?: {
      displaySize?: number;
      transparency?: number;
      theme?: string;
    };
  }

  export interface ErudaTool {
    show: () => void;
    hide: () => void;
  }

  export interface Eruda {
    init: (options?: InitOptions) => void;
    destroy: () => void;
    show: (name?: string) => void;
    hide: () => void;
    get: (name?: string) => ErudaTool | undefined;
    position: (pos: { x: number; y: number }) => void;
    scale: (s: number) => void;
    _isInit?: boolean;
  }

  const eruda: Eruda;
  export default eruda;
}
