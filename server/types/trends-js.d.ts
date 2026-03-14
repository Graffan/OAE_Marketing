declare module "trends-js" {
  interface TrendsOptions {
    keyword?: string | string[];
    geo?: string;
    startTime?: Date;
    endTime?: Date;
    category?: number;
    hl?: string;
    timezone?: number;
    enableBackoff?: boolean;
  }

  function dailyTrends(options?: TrendsOptions): Promise<string>;
  function realTimeTrends(options?: TrendsOptions): Promise<string>;
  function interestOverTime(options?: TrendsOptions): Promise<string>;
  function interestByRegion(options?: TrendsOptions): Promise<string>;
  function relatedQueries(options?: TrendsOptions): Promise<string>;
  function relatedTopics(options?: TrendsOptions): Promise<string>;
  function autoComplete(options?: TrendsOptions): Promise<string>;

  export default {
    dailyTrends,
    realTimeTrends,
    interestOverTime,
    interestByRegion,
    relatedQueries,
    relatedTopics,
    autoComplete,
  };
}
