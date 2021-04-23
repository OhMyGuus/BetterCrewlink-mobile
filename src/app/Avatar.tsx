import React from 'react';
import { useStyles } from "../common/@andywer/style-hook/lib/index";
import { Player } from './services/AmongUsState';
import { backLayerHats, hatOffsets, hats, skins, players, hatXOffsets } from './cosmetics';
import {
	IonAvatar,
    IonContent,
    IonImg,
} from '@ionic/react';
import {
    WifiSharp,
    LinkSharp,
    VolumeMuteSharp,
    MicOffCircleSharp,
} from 'react-ionicons';

interface UseStylesParams {
	size: number;
	borderColor: string;
}
const style = useStyles(() => ({
	avatar: {
		borderRadius: '50%',
		position: 'relative',
		borderStyle: 'solid',
		transition: 'border-color .2s ease-out',
		borderColor: ({ borderColor }: UseStylesParams) => borderColor,
		borderWidth: ({ size }: UseStylesParams) => Math.max(2, size / 40),
		width: '100%',
		paddingBottom: '100%',
	},
	canvas: {
		position: 'absolute',
		width: '100%',
	},
	icon: {
		background: '#ea3c2a',
		position: 'absolute',
		left: '50%',
		top: '50%',
		transform: 'translate(-50%, -50%)',
		border: '2px solid #690a00',
		borderRadius: '50%',
		padding: 2,
		zIndex: 10,
	},
}));

export interface CanvasProps {
	src: string;
	hat: number;
	skin: number;
	isAlive: boolean;
	className: string;
}

export interface AvatarProps {
	talking: boolean;
	borderColor: string;
	isAlive: boolean;
	player: Player;
	size: number;
	deafened?: boolean;
	muted?: boolean;
	connectionState?: 'disconnected' | 'novoice' | 'connected';
	style?: React.CSSProperties;
	onSelect?: (player: Player) => void;
}

const Avatar: React.FC<AvatarProps> = function ({
	talking,
	deafened,
	muted,
	borderColor,
	isAlive,
	player,
	size,
	connectionState,
	style,
	onSelect,
}: AvatarProps) {
	const status = isAlive ? 'alive' : 'dead';
	let image = players[status][player.colorId];
	if (!image) image = players[status][0];
	const classes = useStyles({
		borderColor: talking ? borderColor : 'transparent',
		size,
	});

	let icon;

	switch (connectionState) {
		case 'connected':
			if (deafened) {
				icon = <VolumeMuteSharp 
                    color = { '#ea3c2a' }
					style = {`
						background: '#ea3c2a';
						position: 'absolute';
						left: '50%';
						top: '50%';
						transform: 'translate(-50%, -50%)';
						border: '2px solid #690a00';
						borderRadius: '50%';
						padding: 2;
						zIndex: 10;
						`}
                />;
			} else if (muted) {
				icon = <MicOffCircleSharp
                    color = { '#ea3c2a' }
					style = {`
						background: '#ea3c2a';
						position: 'absolute';
						left: '50%';
						top: '50%';
						transform: 'translate(-50%, -50%)';
						border: '2px solid #690a00';
						borderRadius: '50%';
						padding: 2;
						zIndex: 10;
						`}
                />;
			}
			break;
		case 'novoice':
			icon = (
				<LinkSharp
                    color = { '#ea3c2a' }
					style = {`
						background: '#ea3c2a';
						position: 'absolute';
						left: '50%';
						top: '50%';
						transform: 'translate(-50%, -50%)';
						border: '2px solid #690a00';
						borderRadius: '50%';
						padding: 2;
						zIndex: 10;
						`}
					
				/>
			);
			break;
		case 'disconnected':
			icon = <WifiSharp
                color = { '#ea3c2a' }
				style = {`
					background: '#ea3c2a';
					position: 'absolute';
					left: '50%';
					top: '50%';
					transform: 'translate(-50%, -50%)';
					border: '2px solid #690a00';
					borderRadius: '50%';
					padding: 2;
					zIndex: 10;
					`}
            />;
			break;
	}

	return (
		<IonContent style={style} onClick={onSelect ? () => onSelect(player) : undefined}>
			<Canvas
				className={classes.canvas}
				src={image}
				hat={player.hatId - 1}
				skin={player.skinId - 1}
				isAlive={isAlive}
			/>
			{icon}
		</IonContent>
	);
};

interface UseCanvasStylesParams {
	backLayerHat: boolean;
	isAlive: boolean;
}

const useCanvasStyles = useStyles(() => ({
	base: {
		width: '100%',
		position: 'absolute',
		top: 0,
		left: 0,
		zIndex: 2,
	},
	hat: {
		position: 'absolute',
		transform: 'translateX(calc(-50% + 4px)) scale(0.7)',
		zIndex: ({ backLayerHat }: UseCanvasStylesParams) => (backLayerHat ? 1 : 4),
		display: ({ isAlive }: UseCanvasStylesParams) =>
			isAlive ? 'block' : 'none',
	},
	skin: {
		position: 'absolute',
		top: '38%',
		left: '17%',
		width: '73.5%',
		transform: 'scale(0.8)',
		zIndex: 3,
		display: ({ isAlive }: UseCanvasStylesParams) =>
			isAlive ? 'block' : 'none',
	},
}));

function Canvas({ src, hat, skin, isAlive }: CanvasProps) {
	const hatY = 11 - hatOffsets[hat];
	const classes = useCanvasStyles({
		backLayerHat: backLayerHats.has(hat),
		isAlive,
	});

	return (
		<>
			<IonAvatar>
				<img src={src} />
				<img
					src={hats[hat]}
					className={classes.hat}
					style={{ top: `${hatY}%`, left: hatXOffsets[hat.toString()] ?? '50%' }}
				/>
				<img src={skins[skin]}/>
			</IonAvatar>
		</>
	);
}

export default Avatar;