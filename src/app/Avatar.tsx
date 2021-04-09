import React from 'react';
import { Player } from './services/AmongUsState';
import { backLayerHats, hatOffsets, hats, skins, players, hatXOffsets } from './cosmetics';
import {
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
const useStyles = makeStyles(() => ({
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
                />;
			} else if (muted) {
				icon = <MicOffCircleSharp
                    color = { '#ea3c2a' }
                />;
			}
			break;
		case 'novoice':
			icon = (
				<LinkSharp
                    color = { '#ea3c2a' }
				/>
			);
			break;
		case 'disconnected':
			icon = <WifiSharp
                color = { '#ea3c2a' }
            />;
			break;
	}

	return (
		<IonContent className={classes.avatar} style={style} onClick={onSelect ? () => onSelect(player) : undefined}>
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

function Canvas({ src, hat, skin, isAlive }: CanvasProps) {
	const hatImg = useRef<HTMLImageElement>(null);
	const skinImg = useRef<HTMLImageElement>(null);
	const image = useRef<HTMLImageElement>(null);
	const hatY = 11 - hatOffsets[hat];

	return (
		<>
			<IonImg src={src} ref={image} className={classes.base} />
			<IonImg
				src={hats[hat]}
				ref={hatImg}
				className={classes.hat}
				style={{ top: `${hatY}%`, left: hatXOffsets[hat.toString()] ?? '50%' }}
			/>
			<IonImg src={skins[skin]} ref={skinImg} className={classes.skin} />
		</>
	);
}

export default Avatar;