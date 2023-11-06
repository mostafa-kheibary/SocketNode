export const queryParamsParser = (url: string): Record<string, string> => {
  url = url.substring(2);
  const params: Record<string, string> = {};
  for (const param of url.split("&")) {
    const paramArray = param.split("=");
    if (paramArray.length == 2) {
      params[paramArray[0]] = paramArray[1];
    }
  }
  return params;
};
