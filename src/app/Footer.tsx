import React from 'react';
import { IonButton, IonFooter, IonAvatar } from '@ionic/react';

export const appFooter: React.FC = () => {
    return(
        <IonFooter>
            <IonButton href='https://discord.gg/qDqTzvj4SH'>
                <IonAvatar>
                    <img src={'../../assets/icon/discordicon.png'} />
                </IonAvatar>
            </IonButton>
            <IonButton href='https://github.com/OhMyGuus/BetterCrewlink-mobile'>
                <IonAvatar>
                    <img src={'../../assets/icon/giticon.png'} />
                </IonAvatar>
            </IonButton>
        </IonFooter>
    )
}