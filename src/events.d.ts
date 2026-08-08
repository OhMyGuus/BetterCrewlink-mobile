declare module 'events' {
	export class EventEmitter {
		on(event: string | symbol, listener: (...args: unknown[]) => void): this;
		once(event: string | symbol, listener: (...args: unknown[]) => void): this;
		off(event: string | symbol, listener: (...args: unknown[]) => void): this;
		removeListener(event: string | symbol, listener: (...args: unknown[]) => void): this;
		emit(event: string | symbol, ...args: unknown[]): boolean;
	}
}
