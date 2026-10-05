# GoControl for Homey

A Homey app for the **GoControl / Linear GD00Z** Z-Wave garage door opener. Homey has no built-in support for this opener, so without an app it pairs as a generic Z-Wave device with no controls.

This app adds:

- **Open / close** from the device tile, plus Homey's standard garage door Flow cards ("Garage door opened", "Close the garage door", and so on).
- **Door problem** alarm when the opener reports an obstruction, a motor or force limit, a missing tilt sensor, or a malfunction.
- **Tilt sensor battery low** alarm.

It uses the Z-Wave Barrier Operator command class and requires secure (S0) pairing, because the GD00Z ignores open/close commands sent without security.

## Supported devices

| Manufacturer ID | Product type | Product ID |
|---|---|---|
| 335 | 18244 | 13616 |

If your GD00Z reports different IDs (Homey shows them in the generic Z-Wave device's settings), add them to `productTypeId` / `productId` in `app.json`.

Tested on Homey Self-Hosted Server with a Homey Bridge. It should also work on Homey Pro.

## Install

You need a computer on the same network as your Homey.

1. Install [Node.js](https://nodejs.org) (LTS).
2. Install the Homey command-line tool:
   ```
   npm install -g homey
   ```
   On npm 11 or newer, allow the tool's install scripts:
   ```
   npm install -g homey --allow-scripts=sharp,protobufjs,ssh2
   ```
3. Download or clone this repository, open a terminal in its folder, and install its dependency:
   ```
   npm install
   ```
4. Sign in and choose your Homey:
   ```
   homey login
   homey select
   ```
5. Install the app:
   ```
   homey app install
   ```

To watch live logs while testing, use `homey app run --remote` instead. Plain `homey app run` tries to run the app in Docker on your computer, which isn't needed.

## Pair the opener

If the opener is already in Homey as a generic Z-Wave device, remove it first. That runs a Z-Wave exclusion: press the GD00Z's **Learn** button when Homey asks.

1. In Homey, add a new device: **GoControl Garage Door → GD00Z Garage Door Opener**.
2. Press the **Learn** button on the GD00Z when asked.
3. Pair close to your Homey (or Homey Bridge) if you can. Secure pairing is more reliable at short range.

## Notes

- When closing, the GD00Z flashes and beeps for about 5 seconds before it moves. That's a required safety warning.
- The app checks the door position about 10, 25 and 45 seconds after each command, since the opener doesn't always report the final state on its own.
- The tilt sensor must be mounted on the door and paired to the GD00Z, or the opener refuses to close.

## Troubleshooting

- **No controls on the tile, or commands do nothing:** the opener probably paired without security. Remove it and pair again closer to Homey.
- **Pairing picks a generic Z-Wave device:** check the app is installed (Settings → Apps) and add the device from the app's list rather than generic Z-Wave.

## License

[MIT](LICENSE)
