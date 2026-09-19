// Regression coverage for the connecting-screen status line. This used to read
// `cManager.oldGameState.gameState` unguarded, which threw on the first game-state frame
// (oldGameState is only set from the second one) - and because the render happens
// synchronously inside VoiceController's hostUpdate handler, that view-layer TypeError
// was caught there and turned into a full connection error.
import { connectionStageLabel } from './game-helper.service';
import { ConnectingStage } from './ConnectionController.service';
import { AmongUsState, GameState } from '../common/AmongUsState';

function ctx(overrides: { oldGameState?: AmongUsState } = {}) {
	return { gamecode: 'ABCD', amongusUsername: 'Guus', ...overrides };
}

describe('connectionStageLabel', () => {
	it('does not throw when no previous game state is known yet (first frame)', () => {
		expect(connectionStageLabel(ConnectingStage.waitingForYouToJoin, ctx())).toBe(
			'Waiting for you to join with the name Guus --> UNKNOWN'
		);
	});

	it('reports the previous game state once one is known', () => {
		const oldGameState = { gameState: GameState.LOBBY } as unknown as AmongUsState;
		expect(connectionStageLabel(ConnectingStage.waitingForYouToJoin, ctx({ oldGameState }))).toBe(
			'Waiting for you to join with the name Guus --> LOBBY'
		);
	});

	it('falls back to UNKNOWN for an out-of-range game state', () => {
		const oldGameState = { gameState: 99 } as unknown as AmongUsState;
		expect(connectionStageLabel(ConnectingStage.waitingForYouToJoin, ctx({ oldGameState }))).toBe(
			'Waiting for you to join with the name Guus --> UNKNOWN'
		);
	});

	it('renders the other connecting stages', () => {
		expect(connectionStageLabel(ConnectingStage.connectingToVoiceServer, ctx())).toBe('Connecting to voice server..');
		expect(connectionStageLabel(ConnectingStage.searchingForHost, ctx())).toBe(
			'Searching for bettercrewlink PC players in lobby: ABCD'
		);
		expect(connectionStageLabel(ConnectingStage.WaitingForGameData, ctx())).toBe(
			'Waiting to receive gamedata from player'
		);
		expect(connectionStageLabel(ConnectingStage.FullyConnected, ctx())).toBe('Connected to the game...');
		expect(connectionStageLabel(99 as ConnectingStage, ctx())).toBe('unkown state 99');
	});
});
