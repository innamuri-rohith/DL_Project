import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ActivityItem, AlertUpdate, ForestAlert, ForestOverview, GetAlertsParams, GetObservationsParams, HealthStatus, Observation, ObservationInput, RiskZone } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetForestOverviewUrl: () => string;
/**
 * @summary Get forest monitoring overview
 */
export declare const getForestOverview: (options?: Parameters<typeof customFetch>[1]) => Promise<ForestOverview>;
export declare const getGetForestOverviewQueryKey: () => readonly ["/api/forest/overview"];
export declare const getGetForestOverviewQueryOptions: <TData = Awaited<ReturnType<typeof getForestOverview>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getForestOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getForestOverview>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetForestOverviewQueryResult = NonNullable<Awaited<ReturnType<typeof getForestOverview>>>;
export type GetForestOverviewQueryError = ErrorType<unknown>;
/**
 * @summary Get forest monitoring overview
 */
export declare function useGetForestOverview<TData = Awaited<ReturnType<typeof getForestOverview>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getForestOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRiskZonesUrl: () => string;
/**
 * @summary List monitored risk zones
 */
export declare const getRiskZones: (options?: Parameters<typeof customFetch>[1]) => Promise<RiskZone[]>;
export declare const getGetRiskZonesQueryKey: () => readonly ["/api/forest/risk-zones"];
export declare const getGetRiskZonesQueryOptions: <TData = Awaited<ReturnType<typeof getRiskZones>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRiskZones>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRiskZones>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRiskZonesQueryResult = NonNullable<Awaited<ReturnType<typeof getRiskZones>>>;
export type GetRiskZonesQueryError = ErrorType<unknown>;
/**
 * @summary List monitored risk zones
 */
export declare function useGetRiskZones<TData = Awaited<ReturnType<typeof getRiskZones>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRiskZones>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetObservationsUrl: (params?: GetObservationsParams) => string;
/**
 * @summary List wildlife and vegetation observations
 */
export declare const getObservations: (params?: GetObservationsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Observation[]>;
export declare const getGetObservationsQueryKey: (params?: GetObservationsParams) => readonly ["/api/forest/observations", ...GetObservationsParams[]];
export declare const getGetObservationsQueryOptions: <TData = Awaited<ReturnType<typeof getObservations>>, TError = ErrorType<unknown>>(params?: GetObservationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getObservations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getObservations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetObservationsQueryResult = NonNullable<Awaited<ReturnType<typeof getObservations>>>;
export type GetObservationsQueryError = ErrorType<unknown>;
/**
 * @summary List wildlife and vegetation observations
 */
export declare function useGetObservations<TData = Awaited<ReturnType<typeof getObservations>>, TError = ErrorType<unknown>>(params?: GetObservationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getObservations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateObservationUrl: () => string;
/**
 * @summary Record a wildlife or vegetation observation
 */
export declare const createObservation: (observationInput: ObservationInput, options?: Parameters<typeof customFetch>[1]) => Promise<Observation>;
export declare const getCreateObservationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createObservation>>, TError, {
        data: BodyType<ObservationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createObservation>>, TError, {
    data: BodyType<ObservationInput>;
}, TContext>;
export type CreateObservationMutationResult = NonNullable<Awaited<ReturnType<typeof createObservation>>>;
export type CreateObservationMutationBody = BodyType<ObservationInput>;
export type CreateObservationMutationError = ErrorType<unknown>;
/**
* @summary Record a wildlife or vegetation observation
*/
export declare const useCreateObservation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createObservation>>, TError, {
        data: BodyType<ObservationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createObservation>>, TError, {
    data: BodyType<ObservationInput>;
}, TContext>;
export declare const getGetAlertsUrl: (params?: GetAlertsParams) => string;
/**
 * @summary List forest department alerts
 */
export declare const getAlerts: (params?: GetAlertsParams, options?: Parameters<typeof customFetch>[1]) => Promise<ForestAlert[]>;
export declare const getGetAlertsQueryKey: (params?: GetAlertsParams) => readonly ["/api/forest/alerts", ...GetAlertsParams[]];
export declare const getGetAlertsQueryOptions: <TData = Awaited<ReturnType<typeof getAlerts>>, TError = ErrorType<unknown>>(params?: GetAlertsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAlertsQueryResult = NonNullable<Awaited<ReturnType<typeof getAlerts>>>;
export type GetAlertsQueryError = ErrorType<unknown>;
/**
 * @summary List forest department alerts
 */
export declare function useGetAlerts<TData = Awaited<ReturnType<typeof getAlerts>>, TError = ErrorType<unknown>>(params?: GetAlertsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAlerts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateAlertUrl: (id: number) => string;
/**
 * @summary Update an alert status
 */
export declare const updateAlert: (id: number, alertUpdate: AlertUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<ForestAlert>;
export declare const getUpdateAlertMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAlert>>, TError, {
        id: number;
        data: BodyType<AlertUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAlert>>, TError, {
    id: number;
    data: BodyType<AlertUpdate>;
}, TContext>;
export type UpdateAlertMutationResult = NonNullable<Awaited<ReturnType<typeof updateAlert>>>;
export type UpdateAlertMutationBody = BodyType<AlertUpdate>;
export type UpdateAlertMutationError = ErrorType<void>;
/**
* @summary Update an alert status
*/
export declare const useUpdateAlert: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAlert>>, TError, {
        id: number;
        data: BodyType<AlertUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAlert>>, TError, {
    id: number;
    data: BodyType<AlertUpdate>;
}, TContext>;
export declare const getGetForestActivityUrl: () => string;
/**
 * @summary List recent monitoring activity
 */
export declare const getForestActivity: (options?: Parameters<typeof customFetch>[1]) => Promise<ActivityItem[]>;
export declare const getGetForestActivityQueryKey: () => readonly ["/api/forest/activity"];
export declare const getGetForestActivityQueryOptions: <TData = Awaited<ReturnType<typeof getForestActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getForestActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getForestActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetForestActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getForestActivity>>>;
export type GetForestActivityQueryError = ErrorType<unknown>;
/**
 * @summary List recent monitoring activity
 */
export declare function useGetForestActivity<TData = Awaited<ReturnType<typeof getForestActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getForestActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map