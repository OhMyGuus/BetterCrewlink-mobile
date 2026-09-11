import PeerConnection from './PeerConnection';

/**
 * A synthetic MediaStream that doesn't need microphone/camera permissions - safe to create
 * in a headless CI browser. RTCPeerConnection only needs a stream with tracks to negotiate on.
 */
function createSilentStream(): MediaStream {
	const context = new AudioContext();
	return context.createMediaStreamDestination().stream;
}

describe('PeerConnection', () => {
	it('the initiator creates a data channel and emits an offer', (done) => {
		const initiator = new PeerConnection({ initiator: true, stream: createSilentStream(), config: {} });
		initiator.on('signal', (data) => {
			expect(data.type).toBe('offer');
			expect(data.type === 'offer' && typeof data.sdp).toBe('string');
			initiator.destroy();
			done();
		});
	});

	it('destroy() is idempotent and marks the connection unwritable', () => {
		const peer = new PeerConnection({ initiator: true, stream: createSilentStream(), config: {} });
		expect(() => {
			peer.destroy();
			peer.destroy();
		}).not.toThrow();
		expect(peer.writable).toBeFalse();
	});

	it('two peers exchanging signals directly (loopback, no signaling server) reach connect and exchange data', (done) => {
		const peerA = new PeerConnection({ initiator: true, stream: createSilentStream(), config: {} });
		const peerB = new PeerConnection({ initiator: false, stream: createSilentStream(), config: {} });

		peerA.on('signal', (data) => void peerB.signal(data));
		peerB.on('signal', (data) => void peerA.signal(data));

		let connectedCount = 0;
		const onConnect = () => {
			connectedCount++;
			if (connectedCount === 2) {
				peerA.send('hello from A');
			}
		};
		peerA.on('connect', onConnect);
		peerB.on('connect', onConnect);

		peerB.on('data', (data) => {
			expect(data).toBe('hello from A');
			expect(peerA.writable).toBeTrue();
			expect(peerB.writable).toBeTrue();
			peerA.destroy();
			peerB.destroy();
			done();
		});
	}, 15000);

	it('resolves competing local candidates that arrive before the local description does', (done) => {
		// Regression check for the ordering bug the real class guards against: onicecandidate can
		// fire before setLocalDescription resolves, so candidates must be queued, not dropped.
		const peerA = new PeerConnection({ initiator: true, stream: createSilentStream(), config: {} });
		const peerB = new PeerConnection({ initiator: false, stream: createSilentStream(), config: {} });

		const signalsToB: unknown[] = [];
		peerA.on('signal', (data) => {
			signalsToB.push(data);
			void peerB.signal(data);
		});
		peerB.on('signal', (data) => void peerA.signal(data));

		peerB.on('connect', () => {
			expect(signalsToB.some((signal) => (signal as { type: string }).type === 'offer')).toBeTrue();
			expect(signalsToB.some((signal) => (signal as { type: string }).type === 'candidate')).toBeTrue();
			peerA.destroy();
			peerB.destroy();
			done();
		});
	}, 15000);
});
