import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";
//import { latLng } from "npm:@types/leaflet@^1.9.14";

interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

/*class Geocache implements Momento<string> {
  i: number;
  j: number;
  numCoins: number;
  constructor() {
    this.i = 0;
    this.j = 1;
    this.numCoins = 2;
  }
  toMomento() {
    return this.numCoins.toString();
  }

  fromMomento(momento: string) {
    this.numCoins = parseInt(momento);
  }
}*/

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    // ...
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    // ...
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      // ...
      i: point.lat,
      j: point.lng,
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    // ...
    const cellGridI = Math.round((cell.i - SF_CHINATOWN.lat) / TILE_DEGREES);
    const cellGridJ = Math.round((cell.j - SF_CHINATOWN.lng) / TILE_DEGREES);
    return leaflet.latLngBounds([
      [cell.i, cell.j],
      [
        SF_CHINATOWN.lat + (cellGridI + 1) * TILE_DEGREES,
        SF_CHINATOWN.lng + (cellGridJ + 1) * TILE_DEGREES,
      ],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    // ...
    const startI = originCell.i - this.tileVisibilityRadius;
    const endI = originCell.i + this.tileVisibilityRadius;
    const startJ = originCell.j - this.tileVisibilityRadius;
    const endJ = originCell.j + this.tileVisibilityRadius;

    for (let i = startI; i <= endI; i++) {
      for (let j = startJ; j <= endJ; j++) {
        resultCells.push(this.getCanonicalCell({ i, j }));
      }
    }
    return resultCells;
  }
}

const app = document.querySelector<HTMLDivElement>("#app")!;

const _canvas = document.getElementById("statusPanel");
//const _ctx = canvas?.getContext("2d");

const alertButton = document.createElement("button");
alertButton.innerHTML = "Click Me";
app.append(alertButton);

alertButton.onclick = () => {
  alert("You've clicked the button!");
};
// Location of our classroom (as identified on Google Maps)
const SF_CHINATOWN = leaflet.latLng(37.793439, -122.410296);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 20;
const CACHE_SPAWN_PROBABILITY = 0.05;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: SF_CHINATOWN,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(SF_CHINATOWN);
let playerPosI = SF_CHINATOWN.lat;
let playerPosJ = SF_CHINATOWN.lng;
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

const leftButton = document.createElement("button");
leftButton.innerHTML = "⬅️";
app.append(leftButton);
const rightButton = document.createElement("button");
rightButton.innerHTML = "⬆️";
app.append(rightButton);
const upButton = document.createElement("button");
upButton.innerHTML = "➡️";
app.append(upButton);
const southButton = document.createElement("button");
southButton.innerHTML = "⬇️";
app.append(southButton);

leftButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI, playerPosJ - 0.0001);
  playerMarker.setLatLng(newPos);
  playerPosJ = playerPosJ - 0.0001;
  map.panTo(newPos);
};
southButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI - 0.0001, playerPosJ);
  playerMarker.setLatLng(newPos);
  playerPosI = playerPosI - 0.0001;
  map.panTo(newPos);
};
upButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI, playerPosJ + 0.0001);
  playerMarker.setLatLng(newPos);
  playerPosJ = playerPosJ + 0.0001;
  map.panTo(newPos);
};
rightButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI + 0.0001, playerPosJ);
  playerMarker.setLatLng(newPos);
  playerPosI = playerPosI + 0.0001;
  map.panTo(newPos);
};

// Add caches to the map by cell numbers
function spawnCache(cell: Cell) {
  const newBoard: Board = new Board(16, 16);
  const boundedCell = newBoard.getCellForPoint(leaflet.latLng(cell.i, cell.j));
  const bounds = newBoard.getCellBounds(boundedCell);
  // Convert cell numbers into lat/lng bounds

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let pointValue = Math.floor(
      luck([cell.i, cell.j, "initialValue"].toString()) * 100,
    );

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${cell.i}:${cell.j}#${
      newBoard.getCellsNearPoint(cell).length
    }
    )}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="poke">poke</button><button id="place">place</button>`;

    // Clicking the button decrements the cache's value and increments the player's points

    popupDiv
      .querySelector<HTMLButtonElement>("#poke")! //take a point from cache
      .addEventListener("click", () => {
        pointValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
        playerPoints++;
        statusPanel.innerHTML = `${playerPoints} points accumulated`;
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#place")! //Leave a point in cache
      .addEventListener("click", () => {
        if (playerPoints > 0) {
          pointValue++;
          playerPoints--;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            pointValue.toString();
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        }
      });

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache({
        i: SF_CHINATOWN.lat + i * TILE_DEGREES,
        j: SF_CHINATOWN.lng + j * TILE_DEGREES,
      });
    }
  }
}
