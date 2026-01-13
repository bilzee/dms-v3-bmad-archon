declare module 'react-leaflet-markercluster' {
  import { ReactElement } from 'react';
  import { MarkerClusterGroupOptions, DivIcon } from 'leaflet';

  interface MarkerClusterGroupProps extends MarkerClusterGroupOptions {
    children?: ReactElement | ReactElement[];
    className?: string;
    iconCreateFunction?: (cluster: any) => DivIcon;
    chunkedLoading?: boolean;
    maxClusterRadius?: number;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
  }

  const MarkerClusterGroup: React.ComponentType<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}