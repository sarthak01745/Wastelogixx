import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/api-error";

type PlaceAddress = {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  road?: string;
  hamlet?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country_code?: string;
};

type NominatimPlaceResult = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: PlaceAddress;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: number[][];
      type?: string;
    };
  }>;
};

type PlaceSummary = {
  id: string;
  queryText: string | null;
  displayName: string;
  formattedAddress: string;
  cityName: string | null;
  areaName: string | null;
  stateName: string | null;
  countryCode: string | null;
  lat: number;
  lng: number;
};

const nominatimBaseUrl = "https://nominatim.openstreetmap.org";
const osrmBaseUrl = "https://router.project-osrm.org";

const resolveCityName = (address?: PlaceAddress) =>
  address?.city ?? address?.town ?? address?.village ?? address?.county ?? address?.state_district ?? null;

const resolveAreaName = (address?: PlaceAddress) =>
  address?.suburb ?? address?.neighbourhood ?? address?.quarter ?? address?.road ?? address?.hamlet ?? null;

const normalizeQuery = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const isCacheUnavailable = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return code === "P2021" || code === "42P01" || message.includes("placecache") || message.includes("routeplancache");
};

const asPlaceSummary = (place: {
  id: string;
  queryText: string | null;
  displayName: string;
  formattedAddress: string;
  cityName: string | null;
  areaName: string | null;
  stateName: string | null;
  countryCode: string | null;
  lat: number;
  lng: number;
}) => ({
  id: place.id,
  queryText: place.queryText,
  displayName: place.displayName,
  formattedAddress: place.formattedAddress,
  cityName: place.cityName,
  areaName: place.areaName,
  stateName: place.stateName,
  countryCode: place.countryCode,
  lat: place.lat,
  lng: place.lng,
});

const fetchJson = async <T>(url: string) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "WasteLogix/1.0 (route-planning)",
      "Accept-Language": "en-IN",
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Map service request failed");
  }

  return (await response.json()) as T;
};

const sampleRouteIndexes = (coordinateCount: number) => {
  if (coordinateCount <= 1) {
    return [0];
  }

  const targets = [0, 0.25, 0.5, 0.75, 1];

  return Array.from(
    new Set(
      targets.map((ratio) => Math.max(0, Math.min(coordinateCount - 1, Math.round((coordinateCount - 1) * ratio)))),
    ),
  ).sort((left, right) => left - right);
};

export class RoutePlannerService {
  private static async resolvePlace(query: string) {
    const normalized = normalizeQuery(query);

    if (!normalized) {
      throw new ApiError(400, "Place name is required");
    }

    const cacheKey = `search:${normalized}`;
    const cached = await prisma.placeCache
      .findUnique({
        where: {
          cacheKey,
        },
      })
      .catch((error) => {
        if (isCacheUnavailable(error)) {
          return null;
        }

        throw error;
      });

    if (cached) {
      await prisma.placeCache
        .update({
          where: {
            id: cached.id,
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        })
        .catch((error) => {
          if (!isCacheUnavailable(error)) {
            throw error;
          }
        });

      return asPlaceSummary(cached);
    }

    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      limit: "1",
      countrycodes: "in",
      q: query.trim(),
    });

    const [result] = await fetchJson<NominatimPlaceResult[]>(`${nominatimBaseUrl}/search?${params.toString()}`);

    if (!result?.display_name || !result.lat || !result.lon) {
      throw new ApiError(404, `Could not find a place match for "${query}"`);
    }

    const placeSummary = {
      id: `volatile-place-${result.place_id ?? normalized}`,
      queryText: query.trim(),
      displayName: result.display_name,
      formattedAddress: result.display_name,
      cityName: resolveCityName(result.address),
      areaName: resolveAreaName(result.address),
      stateName: result.address?.state ?? null,
      countryCode: result.address?.country_code?.toUpperCase() ?? null,
      lat: Number(result.lat),
      lng: Number(result.lon),
    };

    const created = await prisma.placeCache.create({
      data: {
        cacheKey,
        queryText: placeSummary.queryText,
        displayName: placeSummary.displayName,
        formattedAddress: placeSummary.formattedAddress,
        cityName: placeSummary.cityName,
        areaName: placeSummary.areaName,
        stateName: placeSummary.stateName,
        countryCode: placeSummary.countryCode,
        lat: placeSummary.lat,
        lng: placeSummary.lng,
        meta: {
          placeId: result.place_id ?? null,
          rawAddress: result.address ?? null,
        },
      },
    }).catch((error) => {
      if (isCacheUnavailable(error)) {
        return null;
      }

      throw error;
    });

    return created ? asPlaceSummary(created) : placeSummary;
  }

  private static async reverseLookup(lat: number, lng: number) {
    const cacheKey = `reverse:${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = await prisma.placeCache
      .findUnique({
        where: {
          cacheKey,
        },
      })
      .catch((error) => {
        if (isCacheUnavailable(error)) {
          return null;
        }

        throw error;
      });

    if (cached) {
      await prisma.placeCache
        .update({
          where: {
            id: cached.id,
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        })
        .catch((error) => {
          if (!isCacheUnavailable(error)) {
            throw error;
          }
        });

      return asPlaceSummary(cached);
    }

    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      zoom: "16",
      lat: String(lat),
      lon: String(lng),
    });

    const result = await fetchJson<NominatimPlaceResult>(`${nominatimBaseUrl}/reverse?${params.toString()}`);

    const placeSummary = {
      id: `volatile-reverse-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      queryText: null,
      displayName: result.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      formattedAddress: result.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      cityName: resolveCityName(result.address),
      areaName: resolveAreaName(result.address),
      stateName: result.address?.state ?? null,
      countryCode: result.address?.country_code?.toUpperCase() ?? null,
      lat,
      lng,
    };

    const created = await prisma.placeCache.create({
      data: {
        cacheKey,
        displayName: placeSummary.displayName,
        formattedAddress: placeSummary.formattedAddress,
        cityName: placeSummary.cityName,
        areaName: placeSummary.areaName,
        stateName: placeSummary.stateName,
        countryCode: placeSummary.countryCode,
        lat,
        lng,
        meta: {
          placeId: result.place_id ?? null,
          rawAddress: result.address ?? null,
        },
      },
    }).catch((error) => {
      if (isCacheUnavailable(error)) {
        return null;
      }

      throw error;
    });

    return created ? asPlaceSummary(created) : placeSummary;
  }

  private static async resolveRoutePlan(origin: PlaceSummary, destination: PlaceSummary) {
    const cacheKey = `route:${origin.id}:${destination.id}`;
    const cached = await prisma.routePlanCache
      .findUnique({
        where: {
          cacheKey,
        },
      })
      .catch((error) => {
        if (isCacheUnavailable(error)) {
          return null;
        }

        throw error;
      });

    if (cached) {
      await prisma.routePlanCache
        .update({
          where: {
            id: cached.id,
          },
          data: {
            usageCount: {
              increment: 1,
            },
          },
        })
        .catch((error) => {
          if (!isCacheUnavailable(error)) {
            throw error;
          }
        });

      return cached;
    }

    const routeUrl = `${osrmBaseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
    const routeResponse = await fetchJson<OsrmRouteResponse>(routeUrl);
    const route = routeResponse.routes?.[0];
    const coordinates = route?.geometry?.coordinates ?? [];

    if (routeResponse.code !== "Ok" || !route || coordinates.length < 2) {
      throw new ApiError(502, "Could not generate a route path from the selected places");
    }

    const distanceKm = Number(((route.distance ?? 0) / 1000).toFixed(1));
    const estimatedDuration = Math.max(1, Math.round((route.duration ?? 0) / 60));
    const sampleIndexes = sampleRouteIndexes(coordinates.length);

    const checkpoints = await Promise.all(
      sampleIndexes.map(async (coordinateIndex) => {
        const [lng, lat] = coordinates[coordinateIndex];
        const isStart = coordinateIndex === 0;
        const isEnd = coordinateIndex === coordinates.length - 1;
        const place = isStart
          ? origin
          : isEnd
            ? destination
            : await this.reverseLookup(lat, lng);

        return {
          cityName: place.cityName ?? origin.cityName ?? destination.cityName ?? "Route corridor",
          areaName: place.areaName ?? place.cityName ?? `Checkpoint ${coordinateIndex + 1}`,
          lat,
          lng,
          odometerKm: Math.round((coordinateIndex / Math.max(coordinates.length - 1, 1)) * distanceKm),
        };
      }),
    );

    const routePlan = {
      id: `volatile-route-${origin.id}-${destination.id}`,
      expectedPath: {
        type: "LineString",
        coordinates,
      },
      routeCheckpoints: checkpoints,
      expectedDistanceKm: distanceKm,
      estimatedDuration,
    };

    const created = await prisma.routePlanCache.create({
      data: {
        cacheKey,
        originPlaceId: origin.id,
        destinationPlaceId: destination.id,
        expectedPath: {
          type: "LineString",
          coordinates,
        },
        routeCheckpoints: checkpoints,
        expectedDistanceKm: distanceKm,
        estimatedDuration,
        meta: {
          provider: "OSRM",
        },
      },
    }).catch((error) => {
      if (isCacheUnavailable(error)) {
        return null;
      }

      throw error;
    });

    return created ?? routePlan;
  }

  static async planRoute(payload: { originQuery: string; destinationQuery: string }) {
    const origin = await this.resolvePlace(payload.originQuery);
    const destination = await this.resolvePlace(payload.destinationQuery);
    const routePlan = await this.resolveRoutePlan(origin, destination);

    return {
      origin,
      destination,
      routeStart: origin.formattedAddress,
      routeEnd: destination.formattedAddress,
      routeStartCity: origin.cityName ?? origin.stateName ?? "Unknown origin",
      routeStartArea: origin.areaName ?? origin.cityName ?? "Origin checkpoint",
      routeEndCity: destination.cityName ?? destination.stateName ?? "Unknown destination",
      routeEndArea: destination.areaName ?? destination.cityName ?? "Destination checkpoint",
      expectedPath: routePlan.expectedPath,
      routeCheckpoints: routePlan.routeCheckpoints,
      expectedDistanceKm: routePlan.expectedDistanceKm,
      estimatedDuration: routePlan.estimatedDuration,
      cache: {
        routePlanId: routePlan.id,
      },
    };
  }

  static async resolvePlaceFromCoordinates(lat: number, lng: number) {
    return this.reverseLookup(lat, lng);
  }
}
