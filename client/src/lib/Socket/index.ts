import { decodeSocketProtocol } from './protocol/decoder';
import { encodeSocketProtocol } from './protocol/encoder';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { urlProvider, type Params } from './urlProvider';

export interface QueueItem {
	actionName: string;
	data: any;
	options: any;
}

export class SocketConnection {
	private _connection: ReconnectingWebSocket;
	private _queue: QueueItem[] = [];
	private _listeners: { [key: string]: Function[] } = {};

	constructor(url: string, params: Params = {}) {
		this._connection = new ReconnectingWebSocket(urlProvider(url, params), ['binary']);
		this._initListener();
	}

	private async _initListener() {
		this._connection.addEventListener('open', (event) => {
			console.log('connection open');
			this._queue.forEach(({ actionName, data, options }) => {
				this.send(actionName, data, options);
			});
		});
		this._connection.addEventListener('close', (e) => {
			console.log('connection closed: ', e);
		});
		this._connection.addEventListener('error', (e) => {
			console.log('connection error: ', e);
		});

		this._connection.addEventListener('message', ({ data }) => {
			(data as Blob).arrayBuffer().then((buf) => {
				const { data, properties } = decodeSocketProtocol(buf);
				this._listeners[properties.route]?.forEach((callbackFn) => callbackFn(data));
			});
		});
	}
	on<T = any>(actionName: string, callBack: (data: T) => void) {
		if (!this._listeners[actionName]) this._listeners[actionName] = [];
		this._listeners[actionName].push(callBack);
	}
	off(actionName: string, callBack: (event: MessageEvent) => void) {
		if (!this._listeners[actionName]) return;
		this._listeners[actionName] = this._listeners[actionName].filter(
			(callBackFn) => callBackFn !== callBack
		);
	}
	send(
		actionName: string,
		data?: string | Record<string, any> | ArrayBuffer,
		options?: Record<string, any>
	) {
		if (this._connection.readyState !== 1) {
			this._queue.push({ actionName, data, options });
			return;
		}
		const binary = encodeSocketProtocol(actionName, data, options);
		try {
			this._connection.send(binary);
		} catch (error) {
			console.log(error);
		}
	}
}
