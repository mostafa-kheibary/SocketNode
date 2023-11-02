import { decodeSocketProtocol, encodeSocketProtocol } from '../utils/socket';

export interface QueueItem {
	actionName: string;
	data: any;
	options: any;
}

export class SocketConnection extends WebSocket {
	actionListeners: { [key: string]: Function[] } = {};
	authenticated = false;
	queue: QueueItem[] = [];

	constructor(url: string, protocols?: string | string[]) {
		super(url, protocols);

		this.addEventListener('open', () => {
			this.addActionListener('auth', () => {
				this.authenticated = true;
				this.queue.forEach(({ actionName, data, options }) => {
					this.sendAction(actionName, data, options);
				});
			});
		});
		window.addEventListener('offline', () => {
			this.close();
		});
		window.addEventListener('online', async () => {
			// this.reconnect();
		});
		this.addEventListener('close', (e) => {
			this.authenticated = false;

			console.log('connection closed: ', e);
		});
		this.addEventListener('error', (e) => {
			console.log('connection error: ', e);
		});

		this.addEventListener('message', (event) => {
			(event.data as Blob).arrayBuffer().then((buf) => {
				const { data, properties } = decodeSocketProtocol(buf);
				this.actionListeners[properties.route]?.forEach((callbackFn) =>
					callbackFn({ ...event, data: data })
				);
			});
		});
	}

	addActionListener(actionName: string, callBack: (event: MessageEvent) => void) {
		if (!this.actionListeners[actionName]) this.actionListeners[actionName] = [];
		this.actionListeners[actionName].push(callBack);
	}
	removeActionListener(actionName: string, callBack: (event: MessageEvent) => void) {
		if (!this.actionListeners[actionName]) return;
		this.actionListeners[actionName] = this.actionListeners[actionName].filter(
			(callBackFn) => callBackFn !== callBack
		);
	}
	sendAction(
		actionName: string,
		data?: string | Record<string, any> | ArrayBuffer,
		options?: Record<string, any>
	) {
		if (!this.authenticated) {
			this.queue.push({ actionName, data, options });
			return;
		}
		const binary = encodeSocketProtocol(actionName, data, options);
		try {
			this.send(binary);
		} catch (error) {
			console.log(error);
		}
	}
}
