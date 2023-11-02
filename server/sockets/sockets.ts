import * as cbor from "cbor";

export const isJsonObject = (string: Record<any, any>) => {
  try {
    JSON.stringify(string);
  } catch (e) {
    return false;
  }
  return true;
};

export const encodeSocketProtocol = (
  actionName: string,
  data?: string | Record<string, any> | ArrayBuffer,
  options?: Record<string, any>
) => {
  const metaData: { route: string; type?: "json" | "text" | "binary"; options?: Record<string, any> } = {
    route: actionName,
    type: "json",
    options,
  };

  if (!Object.keys(metaData.options || {}).length) delete metaData.options;

  if (!data) delete metaData.type;
  else if (typeof data === "string") metaData.type = "text";
  else if (data instanceof ArrayBuffer || data!.byteLength !== undefined) metaData.type = "binary";
  else if (typeof data === "object" && isJsonObject(data)) metaData.type = "json";
  else throw new Error("Provider data is not supported by getway.");

  const metaDataCbor = cbor.encode(metaData);
  const encodeCborData = !data || metaData.type === "binary" ? null : cbor.encode(data);
  const META_DATA_LENGTH_LENGTH = 2;

  const totalLength =
    META_DATA_LENGTH_LENGTH +
    metaDataCbor.byteLength +
    (data ? (metaData.type === "binary" ? (data as ArrayBuffer).byteLength : encodeCborData!.byteLength) : 0);

  const bufferArray = new ArrayBuffer(totalLength);
  const view = new DataView(bufferArray);

  let offset = 0;

  view.setUint16(offset, metaDataCbor.byteLength);
  offset = META_DATA_LENGTH_LENGTH;

  const combinedView = new Int8Array(bufferArray);

  const metaDataInt8Array = new Int8Array(metaDataCbor);
  combinedView.set(metaDataInt8Array, offset);

  offset += metaDataCbor.byteLength;

  if (encodeCborData && metaData.type && ["text", "json"].includes(metaData.type)) {
    const int8Data = new Int8Array(encodeCborData);
    combinedView.set(int8Data, offset);
  } else if (metaData.type === "binary") {
    const int8Data = new Int8Array(data as Buffer);
    combinedView.set(int8Data, offset);
  }

  return combinedView;
};

export const decodeSocketProtocol = (arrayBuffer: ArrayBuffer) => {
  const buffer = new Uint8Array(arrayBuffer);
  const PROPERTIES_OFFSET = 2;

  const length = (buffer[0] << 8) | buffer[1];
  const propertiesBuffer = buffer.slice(PROPERTIES_OFFSET, length + PROPERTIES_OFFSET);
  const properties = cbor.decode(propertiesBuffer, { encoding: "utf-8" });
  const dataBuffer = buffer.slice(PROPERTIES_OFFSET + length);

  let resultData: Uint8Array | Record<string, any> | string | null = dataBuffer.length ? dataBuffer : null;

  if (!resultData) return { data: null, properties };

  if (properties.type && ["text", "json"].includes(properties.type)) {
    resultData = cbor.decode(dataBuffer, { encoding: "utf-8" });
  }

  return { data: resultData, properties };
};
