declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react';

  export interface ComposableMapProps {
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
    };
    width?: number;
    height?: number;
    className?: string;
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;

  export interface GeographiesProps {
    geography?: string | object;
    children?: (data: { geographies: any[] }) => ReactNode;
  }

  export const Geographies: ComponentType<GeographiesProps>;

  export interface GeographyProps {
    geography?: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: any;
    onMouseEnter?: (event: any) => void;
    onMouseLeave?: (event: any) => void;
    onClick?: (event: any) => void;
  }

  export const Geography: ComponentType<GeographyProps>;

  export interface MarkerProps {
    coordinates?: [number, number] | number[];
    children?: ReactNode;
  }

  export const Marker: ComponentType<MarkerProps>;
}

