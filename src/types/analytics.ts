import {SaveEvents} from "./events";

export type UpdateAnalytics = SaveEvents;

export interface AnalyticsData {
    appName: UpdateAnalytics['appName'];
    uToken: UpdateAnalytics['uToken'];
    params: UpdateAnalytics['params'];
    totalEventsCount: number;
    totalRequestsCount: number
    totalRequestsSuccessCount: number;
    totalRequestsErrorCount: number;
    createdTime: string;
    lastUpdatedTime: string;
}
