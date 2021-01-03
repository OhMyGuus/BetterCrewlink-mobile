interface Client {
	playerId: number;
	clientId: number;
}

interface SocketObject {
	htmlElement: HTMLAudioElement;
	client: Client;
}

interface SocketClientMap {
	[socketId: string]: Client;
}
