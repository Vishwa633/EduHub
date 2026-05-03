import { Platform } from "react-native";
import * as Linking from "expo-linking";

const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT || "3000";

const getExpoHost = () => {
	try {
		const url = Linking.createURL("/");
		const match = url.match(/:\/\/([^/:]+)/);
		return match?.[1] || null;
	} catch {
		return null;
	}
};

const resolveApiHost = () => {
	if (process.env.EXPO_PUBLIC_API_HOST) {
		return process.env.EXPO_PUBLIC_API_HOST;
	}

	const expoHost = getExpoHost();
	if (expoHost) {
		if (Platform.OS === "android" && ["localhost", "127.0.0.1"].includes(expoHost)) {
			return "10.0.2.2";
		}

		return expoHost;
	}

	if (Platform.OS === "android") {
		return "10.0.2.2";
	}

	return "localhost";
};

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || `http://${resolveApiHost()}:${DEFAULT_API_PORT}/api`;
const sanitizedApiUrl = rawApiUrl.replace(/\/$/, "");

export const API_URL = sanitizedApiUrl.endsWith("/api")
	? sanitizedApiUrl
	: `${sanitizedApiUrl}/api`;
