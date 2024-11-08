import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

interface Cell {
  readonly i: number;
  readonly j: number;
}

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
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    // ...
    return leaflet.latLngBounds([
      [cell.i, cell.j],
      [
        SF_CHINATOWN.lat +
          (Math.round((cell.i - SF_CHINATOWN.lat) / TILE_DEGREES) + 1) *
            TILE_DEGREES,
        SF_CHINATOWN.lng +
          Math.round((cell.j - SF_CHINATOWN.lng) / TILE_DEGREES + 1) *
            TILE_DEGREES,
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

const testBoard: Board = new Board(16, 16);

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
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

// Add caches to the map by cell numbers
function spawnCache(cell: Cell) {
  // Convert cell numbers into lat/lng bounds
  console.log(testBoard.getCellForPoint(leaflet.latLng(cell.i, cell.j)));
  const origin = SF_CHINATOWN;
  const bounds = leaflet.latLngBounds([
    [cell.i, cell.j],
    [
      origin.lat + ((cell.i - origin.lat) / TILE_DEGREES + 1) * TILE_DEGREES,
      origin.lng + (cell.j - origin.lng) / TILE_DEGREES + 1 * TILE_DEGREES,
    ],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let pointValue = Math.floor(
      luck(
        [
          cell.i * TILE_DEGREES - origin.lat,
          cell.j * TILE_DEGREES - origin.lng,
          "initialValue",
        ].toString()
      ) * 100
    );

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${cell.i}:${cell.j}#${
      testBoard.getCellsNearPoint(cell).length
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
