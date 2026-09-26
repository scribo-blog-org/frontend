import { publicEnv } from "./publicEnv";

export function apiUrl() {
    return publicEnv("NEXT_PUBLIC_APP_API_URL");
}
