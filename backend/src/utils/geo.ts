import {
  booleanPointInPolygon,
  distance,
  featureCollection,
  lineString,
  point,
  pointToLineDistance,
} from "@turf/turf";
import type { Feature, FeatureCollection, GeoJsonProperties, LineString, Polygon } from "geojson";

type RawGeoPath =
  | Feature<LineString | Polygon, GeoJsonProperties>
  | FeatureCollection
  | LineString
  | Polygon
  | number[][];

const normalizeGeometry = (raw: RawGeoPath) => {
  if (Array.isArray(raw)) {
    return lineString(raw);
  }

  if ((raw as FeatureCollection).type === "FeatureCollection") {
    const collection = raw as FeatureCollection;
    return collection.features[0] as Feature<LineString | Polygon, GeoJsonProperties>;
  }

  if ((raw as Feature<LineString | Polygon, GeoJsonProperties>).type === "Feature") {
    return raw as Feature<LineString | Polygon, GeoJsonProperties>;
  }

  return {
    type: "Feature",
    geometry: raw as LineString | Polygon,
    properties: {},
  } as Feature<LineString | Polygon, GeoJsonProperties>;
};

export const metersBetween = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) => distance([from.lng, from.lat], [to.lng, to.lat], { units: "kilometers" }) * 1000;

export const computeDeviationMeters = (rawPath: RawGeoPath, lat: number, lng: number) => {
  const geometry = normalizeGeometry(rawPath);

  if (geometry.geometry.type !== "LineString") {
    return 0;
  }

  return pointToLineDistance(point([lng, lat]), geometry as Feature<LineString>, { units: "kilometers" }) * 1000;
};

export const isInsidePolygon = (rawGeometry: RawGeoPath, lat: number, lng: number) => {
  const geometry = normalizeGeometry(rawGeometry);

  if (geometry.geometry.type !== "Polygon") {
    return false;
  }

  return booleanPointInPolygon(point([lng, lat]), geometry as Feature<Polygon>);
};

export const countStopClusters = (
  coordinates: Array<{ lat: number; lng: number; timestamp: Date }>,
  radiusMeters: number,
  minStopMinutes: number,
) => {
  if (coordinates.length < 2) {
    return 0;
  }

  let clusters = 0;
  let clusterStart = coordinates[0];
  let latest = coordinates[0];

  for (let index = 1; index < coordinates.length; index += 1) {
    const current = coordinates[index];
    const distanceFromStart = metersBetween(clusterStart, current);

    if (distanceFromStart <= radiusMeters) {
      latest = current;
      continue;
    }

    const stoppedMinutes = (latest.timestamp.getTime() - clusterStart.timestamp.getTime()) / 60000;

    if (stoppedMinutes >= minStopMinutes) {
      clusters += 1;
    }

    clusterStart = current;
    latest = current;
  }

  const finalStoppedMinutes = (latest.timestamp.getTime() - clusterStart.timestamp.getTime()) / 60000;

  if (finalStoppedMinutes >= minStopMinutes) {
    clusters += 1;
  }

  return clusters;
};

export const summarizeTrail = (coordinates: Array<{ lat: number; lng: number }>) =>
  featureCollection([
    lineString(coordinates.map((item) => [item.lng, item.lat])),
  ]);
