import axios from "axios";

interface ThirdwebResponse<T = any> {
	data: T;
	status: number;
	statusText: string;
}

async function makeThirdwebRequest<T = any>(
	endpoint: string,
	options: {
		method: string;
		headers?: Record<string, string>;
		data?: any;
	},
): Promise<ThirdwebResponse<T>> {
	const baseUrl = "https://api.thirdweb.com";
	const url = `${baseUrl}${endpoint}`;

	const config = {
		method: options.method,
		url,
		headers: {
			"Content-Type": "application/json",
			"x-secret-key": process.env.THIRDWEB_SECRET_KEY,
			...options.headers,
		},
		...(options.data && { data: options.data }),
	};

	try {
		const response = await axios(config);
		return response;
	} catch (error: any) {
		if (error.response) {
			throw new Error(
				`Thirdweb API error: ${error.response.status} - ${error.response.statusText}`,
			);
		}
		throw new Error(`Thirdweb request failed: ${error.message}`);
	}
}

export async function getUserDetails(authToken: string) {
	const response = await makeThirdwebRequest("/v1/wallets/me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});

	return response;
}
