import * as cbor from "cbor";

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
