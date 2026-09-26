import { publicEnv } from "./publicEnv";

export function API_URL() {
    return publicEnv("NEXT_PUBLIC_APP_API_URL");
}
