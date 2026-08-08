declare module 'events' {
	export class EventEmitter {
		on(event: string | symbol, listener: (...args: any[]) => void): this;
		once(event: string | symbol, listener: (...args: any[]) => void): this;
		off(event: string | symbol, listener: (...args: any[]) => void): this;
		removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
		emit(event: string | symbol, ...args: any[]): boolean;
	}
}
