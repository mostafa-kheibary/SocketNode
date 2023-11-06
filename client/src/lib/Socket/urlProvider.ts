export type Params = Record<string, string | Function>;

export const urlProvider = (url: string, params: Params) => {
	return async () => {
		let baseParamsString = '';

		if (Object.entries(params).length) {
			baseParamsString += '?';
		}
		for (const param in params) {
			if (typeof params[param] === 'function') {
				const result = await (params[param] as Function)();
				baseParamsString += `${param}=${result}&`;
			} else {
				baseParamsString += `${param}=${params[param]}&`;
			}
		}
		return url.concat(baseParamsString);
	};
};
