import { API_URL } from "../config";
import { apiFetch } from "./http";

const getApiDocs = async () => {
    try {
        const response = await apiFetch(
            `${API_URL()}/api/docs`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch API docs: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }   
    catch(error) {
        console.error("Failed to fetch API docs:", error);
    }
}

export { getApiDocs };
