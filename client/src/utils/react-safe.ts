// React-specific null safety utilities

import React from 'react';

// Safe React state initialization
export function useSafeState<T>(initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    try {
      if (typeof initialValue === 'function') {
        return (initialValue as () => T)();
      }
      return initialValue;
    } catch (error) {
      console.warn('Safe state initialization failed:', error);
      return initialValue as T;
    }
  });

  const safeSetState = React.useCallback((value: React.SetStateAction<T>) => {
    try {
      setState(value);
    } catch (error) {
      console.warn('Safe state update failed:', error);
    }
  }, []);

  return [state, safeSetState];
}

// Safe React effect hook
export function useSafeEffect(effect: React.EffectCallback, deps?: React.DependencyList) {
  React.useEffect(() => {
    try {
      return effect();
    } catch (error) {
      console.warn('Safe effect failed:', error);
    }
  }, deps);
}

// Safe React callback hook
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
): T {
  return React.useCallback(
    ((...args: Parameters<T>) => {
      try {
        return callback(...args);
      } catch (error) {
        console.warn('Safe callback failed:', error);
      }
    }) as T,
    deps,
  );
}

// Safe React memo hook
export function useSafeMemo<T>(factory: () => T, deps: React.DependencyList): T {
  return React.useMemo(() => {
    try {
      return factory();
    } catch (error) {
      console.warn('Safe memo failed:', error);
      return factory();
    }
  }, deps);
}

// Safe React ref hook
export function useSafeRef<T>(initialValue: T): React.MutableRefObject<T> {
  const ref = React.useRef<T>(initialValue);

  React.useEffect(() => {
    try {
      if (ref.current === null || ref.current === undefined) {
        ref.current = initialValue;
      }
    } catch (error) {
      console.warn('Safe ref initialization failed:', error);
    }
  }, [initialValue]);

  return ref;
}

// Safe React context hook
export function useSafeContext<T>(context: React.Context<T>): T {
  try {
    const value = React.useContext(context);
    if (value === null || value === undefined) {
      throw new Error('Context value is null or undefined');
    }
    return value;
  } catch (error) {
    console.warn('Safe context failed:', error);
    throw error;
  }
}

// Safe React reducer hook
export function useSafeReducer<R extends React.Reducer<any, any>>(
  reducer: R,
  initialState: React.ReducerState<R>,
): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>] {
  const safeReducer = React.useCallback((state: React.ReducerState<R>, action: React.ReducerAction<R>) => {
    try {
      return reducer(state, action);
    } catch (error) {
      console.warn('Safe reducer failed:', error);
      return state;
    }
  }, [reducer]);

  return React.useReducer(safeReducer, initialState);
}

// Safe local storage hook
export function useSafeLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn('Safe localStorage read failed:', error);
      return initialValue;
    }
  });

  const setValue = React.useCallback((value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Safe localStorage write failed:', error);
    }
  }, [key]);

  return [storedValue, setValue];
}

// Safe window resize hook
export function useSafeWindowSize(): { width: number; height: number } {
  const [windowSize, setWindowSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      try {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } catch (error) {
        console.warn('Safe window resize failed:', error);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// Safe event listener hook
export function useSafeEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element: EventTarget | null = typeof window !== 'undefined' ? window : null,
) {
  const savedHandler = React.useRef<(event: Event) => void>();

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    if (!element || !element.addEventListener) {
      return;
    }

    const eventListener = (event: Event) => {
      try {
        if (savedHandler.current) {
          savedHandler.current(event);
        }
      } catch (error) {
        console.warn('Safe event listener failed:', error);
      }
    };

    element.addEventListener(eventName, eventListener);
    return () => element.removeEventListener(eventName, eventListener);
  }, [eventName, element]);
}

// Safe intersection observer hook
export function useSafeIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {},
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    try {
      const observer = new IntersectionObserver(
        ([entry]) => {
          try {
            setIsIntersecting(entry.isIntersecting);
          } catch (error) {
            console.warn('Safe intersection observer callback failed:', error);
          }
        },
        options,
      );

      observer.observe(ref.current);
      return () => observer.disconnect();
    } catch (error) {
      console.warn('Safe intersection observer failed:', error);
    }
  }, [ref, options]);

  return isIntersecting;
}
