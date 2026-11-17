import type { GenerateMetodGuidanceBody, GenerateMetodGuidanceResponse, GetFishingWeatherResponse } from "@workspace/api-zod";

export type FishingRecommendations = ReturnType<typeof GenerateMetodGuidanceResponse.parse>;
export type WafterColor = FishingRecommendations["zestaw"]["wafterColors"][number];
export type HookType = FishingRecommendations["zestaw"]["hookType"];
export type GuidanceInput = ReturnType<typeof GenerateMetodGuidanceBody.parse>;
export type WeatherReport = ReturnType<typeof GetFishingWeatherResponse.parse>;
