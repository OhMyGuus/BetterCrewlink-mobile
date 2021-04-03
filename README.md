[![GitHub Downloads][github-shield]][github-url] [![GPL-3.0 License][license-shield]][license-url] [![Support BetterCrewLink][paypal-shield]][paypal-url] [![Support BetterCrewLink][kofi-shield]][kofi-url] [![Discord Server][discord-shield]][discord-url] [![Contributors][contributors-shield]][contributors-url]

<br />
<p align="center">
  <a href="https://github.com/OhMyGuus/BetterCrewlink-mobile">
    <img src="logo.png" alt="Logo" width="80" height="80">
  </a>
  <h3 align="center">BetterCrewLink Mobile is here!</h3>


  <p align="center">
    Free, open, Among Us proximity voice chat.
    <br />
    <a href="https://github.com/OhMyGuus/BetterCrewlink-mobile/issues">Report Bug</a>
    ·
    <a href="https://github.com/OhMyGuus/BetterCrewlink-mobile/issues">Request Feature</a>
    ·
    <a href="#installation">Installation Instructions</a>
  </p>
  <p align="center">
    <b><a href="https://www.paypal.com/donate?hosted_button_id=KS43BDTGN76JQ">Donate to BetterCrewLink</a></b></br>
  (all donations will be used for the apple developer license and extra servers)</br>
   <b><a href="https://paypal.me/ottomated">Donate to ottomated (offical crewlink)</a></b>
  </p>
</p>
<hr />

<p>
  
<b>Notes:</b><br />

- This is an unofficial fork of CrewLink, for any problem, question, issue or suggestion you have with BetterCrewLink talk to us on our [Discord](https://discord.gg/qDqTzvj4SH), or [GitHub](https://github.com/OhMyGuus/BetterCrewlink-mobile/issues) or message me on Discord ([ThaGuus#2140](https://discordapp.com/users/508426414387757057)) do not report any problems to the official Discord or GitHub project of CrewLink as they will not support you.

- To get the most of BetterCrewLink use the voice server: <a href="https://bettercrewl.ink">`https://bettercrewl.ink`</a>

</p>
<a href="https://discord.gg/qDqTzvj4SH"> <img src="https://i.imgur.com/XpnBhTW.png" width="150px" /> </a>

<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
* [Installation](#installation)
  * [Setup Instructions](#setup-instructions)
  * [Android](#android)
  * [iOS](#ios)
* [Development](#development)
  * [Prerequisites](#prerequisites)
  * [Setup](#setup)
* [Contributing](#contributing)
  * [Contributors](#contributors)
* [License](#license)

<!-- ABOUT THE PROJECT -->
## About The Project

This project implements proximity voice chat for mobile users in Among Us. As long as there is a PC user with "Mobile Host" enabled in your lobby, you will be able to hear people near you.

## Installation

Download the latest version from [releases](https://github.com/OhMyGuus/BetterCrewlink-mobile/releases/latest) and run the `Bettercrewlink-v-X-X-X-a.apk` file on your phone. You may have to allow chrome to install apps on your phone.

You can also use the web version in your browser [here](https://web.bettercrewl.ink/).

If you have a PC and want to download the PC version of BetterCrewLink (without being the Bluestacks) go to category [Windows](https://github.com/OhMyGuus/BetterCrewLink#windows).

## Setup Instructions

### Android

* Open the app.
* Ensure there is one person in the lobby with "Mobile Host" enabled on their PC (they must use [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink)).
* Fill in the required information (make sure you have a unique name in your lobby).
* Hit the connect button.
  * If you are waiting on the connecting screen for a while you may want to check that all the information is correct and the is a pc user with "Mobile Host" enabled in the lobby.
* All done!

### iOS

An iOS version is still being developed and will be released soon, but you can use in the meantime the [web version](https://web.bettercrewl.ink/). (requires a PC player)

## Development

You only need to follow the below instructions if you are trying to modify this software. Otherwise, please download the latest version from the [github releases](https://github.com/OhMyGuus/BetterCrewlink-mobile/releases).

Server code is located at [OhMyGuus/BetterCrewLink-server](https://github.com/OhMyGuus/BetterCrewLink-server). Please use a local server for development purposes.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* [node.js](https://nodejs.org/en/download/)
* Ionic cli
```sh
npm install -g @ionic/cli
```

### Setup

1. Clone the repo
```sh
git clone https://github.com/OhMyGuus/BetterCrewlink-mobile.git
cd BetterCrewlink-mobile
```
2. Install packages and sync
```sh
npm install 
ionic capacitor sync
```
3. Run the project
```JS
ionic serve
```

<!-- CONTRIBUTING -->
## Contributing

Any contributions you make are greatly appreciated.

1. [Fork the Project](https://github.com/OhMyGuus/BetterCrewlink-mobile/fork)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Contributors

[![Contributors][contributors-shield]][contributors-url]

* [OhMyGuus](https://github.com/OhMyGuus) for make various things for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink), example: NAT Fix, more overlays, support for Mobile and owner of project
* [ottomated](https://github.com/ottomated) for make [CrewLink](https://github.com/ottomated/CrewLink)
* [vrnagy](https://github.com/vrnagy) for make WebRTC reconnects automatically for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink)
* [TheGreatMcPain](https://github.com/TheGreatMcPain) & [Donokami](https://github.com/Donokami) for make support for Linux
* [squarebracket](https://github.com/squarebracket) for make support overlay for Linux
* [JKohlman](https://github.com/JKohlman) for make various things for [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink), example: push to mute, visual changes and making Multi Stage builds for [BetterCrewLink Server](https://github.com/OhMyGuus/BetterCrewLink-server)
* [Diemo-zz](https://github.com/Diemo-zz) for make the default Voice Server for: <a href="https://bettercrewl.ink">`https://bettercrewl.ink`</a>
* [KadenBiel](https://github.com/KadenBiel) for make various things for [BetterCrewLink Mobile](https://github.com/OhMyGuus/BetterCrewlink-mobile), example: Better UI, Settings page
* [adofou](https://github.com/adofou) for make new parameters for node-turn server for [BetterCrewLink-Server](https://github.com/OhMyGuus/BetterCrewLink-server)
* [Kore-Development](https://github.com/Kore-Development) for make support for Repl.it and gitignore changes for [BetterCrewLink-Server](https://github.com/OhMyGuus/BetterCrewLink-server)
* [cybershard](https://github.com/cybershard) & [edqx](https://github.com/edqx) for make Only hear people in vision, Walls block voice and Hear through cameras
* [electron-overlay-window](https://github.com/SnosMe/electron-overlay-window) for make it easier to do overlays
* [node-keyboard-watcher](https://github.com/OhMyGuus/node-keyboard-watcher) for make it easy to push to talk and push to mute
* [MatadorProBr](https://github.com/MatadorProBr) for make this list of Contribuators, better README.md, wiki

A big thank you to all those people who contributed and still contribute to this project to stay alive, thank you for being part of this BetterCrewLink community!

## License

Distributed under the GNU General Public License v3.0. See <a href="https://github.com/OhMyGuus/BetterCrewlink-mobile/blob/master/LICENSE">`LICENSE`</a> for more information.

[github-shield]: https://img.shields.io/github/downloads/OhMyGuus/BetterCrewlink-mobile/total?label=Downloads
[github-url]: https://github.com/OhMyGuus/BetterCrewlink-mobile/releases/
[license-shield]: https://img.shields.io/github/license/OhMyGuus/BetterCrewlink-mobile?label=License
[license-url]: https://github.com/OhMyGuus/BetterCrewlink-mobile/blob/master/LICENSE
[paypal-shield]: https://img.shields.io/badge/Support-BetterCrewLink-purple?logo=PayPal
[paypal-url]: https://www.paypal.com/donate?hosted_button_id=KS43BDTGN76JQ
[kofi-shield]: https://img.shields.io/badge/Support-BetterCrewLink-purple?logo=Ko-fi&logoColor=white
[kofi-url]: https://ko-fi.com/ohmyguus
[discord-shield]: https://img.shields.io/discord/791516611143270410?color=cornflowerblue&label=Discord&logo=Discord&logoColor=white
[discord-url]: https://discord.gg/qDqTzvj4SH
[contributors-shield]: https://img.shields.io/github/contributors/OhMyGuus/BetterCrewlink-mobile?label=Contributors
[contributors-url]: https://github.com/OhMyGuus/BetterCrewlink-mobile/graphs/contributors
