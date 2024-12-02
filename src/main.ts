import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";
//import { latLng } from "npm:@types/leaflet@^1.9.14";
import { PlayerStorage } from "./playerStorage";

class CacheMemento {
  constructor(public i: number, public j: number, public pointValue: number) {}
}

class CacheFlyweight {
  private static cacheMap: Map<string, CacheFlyweight> = new Map();
  public maxVal: number = 0;
  // The getCache method ensures that we return an existing flyweight or create a new one if it doesn't exist
  static getCache(i: number, j: number): CacheFlyweight {
    const key = `${i},${j}`;
    if (!this.cacheMap.has(key)) {
      this.cacheMap.set(key, new CacheFlyweight(i, j));
    }
    return this.cacheMap.get(key)!;
  }

  // The constructor initializes the cache with its i, j coordinates and the pointValue
  private constructor(public i: number, public j: number) {
    // Initialize pointValue in the constructor
    this.pointValue = Math.floor(
      luck([this.i, this.j, "initialValue"].toString()) * 100,
    );
    this.maxVal = this.pointValue;
  }

  createMemento(): CacheMemento {
    return new CacheMemento(this.i, this.j, this.pointValue);
  }

  // Method to restore the cache's state from a memento
  restoreFromMemento(memento: CacheMemento): void {
    this.i = memento.i;
    this.j = memento.j;
    this.pointValue = memento.pointValue;
  }

  // Cache properties
  pointValue: number; // Initialize this in the constructor

  // Method to decrement points
  decrementPoints(): void {
    this.pointValue--;
  }
  resetCacheValues(): void {
    this.pointValue = this.maxVal;
  }
}

class CacheManager {
  private savedCaches: Map<string, CacheMemento> = new Map();

  // Save cache state
  saveCacheState(i: number, j: number): void {
    const cacheFlyweight = CacheFlyweight.getCache(i, j);
    const memento = cacheFlyweight.createMemento();
    this.savedCaches.set(`${i},${j}`, memento);
  }

  // Restore cache state
  restoreCacheState(i: number, j: number): void {
    const key = `${i},${j}`;
    if (this.savedCaches.has(key)) {
      const memento = this.savedCaches.get(key)!;
      const cacheFlyweight = CacheFlyweight.getCache(i, j);
      cacheFlyweight.restoreFromMemento(memento);
    }
  }

  // Check if cache state exists
  isCacheSaved(i: number, j: number): boolean {
    return this.savedCaches.has(`${i},${j}`);
  }
}

const app = document.querySelector<HTMLDivElement>("#app")!;

const _canvas = document.getElementById("statusPanel");

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
const savedPosition = PlayerStorage.getPlayerPosition();
let playerPosI: number = savedPosition.lat;
let playerPosJ: number = savedPosition.lng;
const playerMarker = leaflet.marker(leaflet.latLng(playerPosI, playerPosJ));
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);
map.panTo(leaflet.latLng(playerPosI, playerPosJ));

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
const teleportButton = document.createElement("button");
teleportButton.innerHTML = "🌐";
app.append(teleportButton);
const resetButton = document.createElement("button");
resetButton.innerHTML = "🚮";
app.append(resetButton);
resetButton.onclick = () => {
  if (confirm("Are you sure you want to reset all progress?")) {
    PlayerStorage.savePlayerPosition(SF_CHINATOWN.lat, SF_CHINATOWN.lng);
    playerPosI = SF_CHINATOWN.lat;
    playerPosJ = SF_CHINATOWN.lng;
    playerMarker.setLatLng(leaflet.latLng(SF_CHINATOWN.lat, SF_CHINATOWN.lng));
    map.panTo(leaflet.latLng(SF_CHINATOWN.lat, SF_CHINATOWN.lng));
    updateNeighborhood(leaflet.latLng(SF_CHINATOWN.lat, SF_CHINATOWN.lng));
    flyWeights.forEach((flyWeight) => {
      flyWeight.resetCacheValues();
    });
    playerPoints = 0;
  }
};
teleportButton.onclick = () => {
  navigator.geolocation.getCurrentPosition(onLocationFound, onLocationError);
};
function onLocationFound(position: GeolocationPosition) {
  playerMarker.setLatLng(
    leaflet.latLng(position.coords.latitude, position.coords.longitude),
  );
  playerPosI = position.coords.latitude;
  playerPosJ = position.coords.longitude;
  map.panTo(
    leaflet.latLng(position.coords.latitude, position.coords.longitude),
  );
  updateNeighborhood(
    leaflet.latLng(position.coords.latitude, position.coords.longitude),
  );
}
function onLocationError() {
  alert(`Dunno where you are. Sorry :c`);
}

leftButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI, playerPosJ - 0.0001);
  playerMarker.setLatLng(newPos);
  playerPosJ = playerPosJ - 0.0001;
  map.panTo(newPos);
  PlayerStorage.savePlayerPosition(newPos.lat, newPos.lng);
  updateNeighborhood(newPos);
};
southButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI - 0.0001, playerPosJ);
  playerMarker.setLatLng(newPos);
  playerPosI = playerPosI - 0.0001;
  map.panTo(newPos);
  PlayerStorage.savePlayerPosition(newPos.lat, newPos.lng);
  updateNeighborhood(newPos);
};
upButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI, playerPosJ + 0.0001);
  playerMarker.setLatLng(newPos);
  playerPosJ = playerPosJ + 0.0001;
  map.panTo(newPos);
  PlayerStorage.savePlayerPosition(newPos.lat, newPos.lng);
  updateNeighborhood(newPos);
};
rightButton.onclick = () => {
  const newPos = leaflet.latLng(playerPosI + 0.0001, playerPosJ);
  playerMarker.setLatLng(newPos);
  playerPosI = playerPosI + 0.0001;
  map.panTo(newPos);
  PlayerStorage.savePlayerPosition(newPos.lat, newPos.lng);
  updateNeighborhood(newPos);
};

const cacheManager = new CacheManager();
const flyWeights: CacheFlyweight[] = [];
// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  const cacheFlyweight = CacheFlyweight.getCache(i, j);
  flyWeights.push(cacheFlyweight);
  // Convert grid cell to lat/lng bounds
  const origin = SF_CHINATOWN;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  const isVisible = map.getBounds().intersects(bounds);

  // If the cache is not visible, save its state off-screen
  if (!isVisible && !cacheManager.isCacheSaved(i, j)) {
    cacheManager.saveCacheState(i, j);
    rect.remove(); // Remove the cache from the map
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${i},${j}". It has value <span id="value">${cacheFlyweight.pointValue}</span>.</div>
                <button id="poke">poke</button>
                <button id="place">place</button>`;

    // Handle poke interaction
    popupDiv
      .querySelector<HTMLButtonElement>("#poke")! //Take from cache
      .addEventListener("click", () => {
        if (cacheFlyweight.pointValue > 0) {
          cacheFlyweight.decrementPoints();
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheFlyweight.pointValue.toString();
          playerPoints++;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#place")! //add a point to cache
      .addEventListener("click", () => {
        if (playerPoints) {
          cacheFlyweight.pointValue++;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheFlyweight.pointValue.toString();
          playerPoints--;
          statusPanel.innerHTML = `${playerPoints} points accumulated`;
        }
      });

    return popupDiv;
  });
}

updateNeighborhood(SF_CHINATOWN);

function computeGridBounds(center: leaflet.LatLng) {
  return [
    Math.floor((center.lat - SF_CHINATOWN.lat) * 10000),
    Math.floor((center.lng - SF_CHINATOWN.lng) * 10000),
  ];
}

function spawnNeighborhoodCaches(newGrid: number[]) {
  const newNeighborhood = new Set<string>();
  for (
    let i = newGrid[0] - NEIGHBORHOOD_SIZE;
    i <= newGrid[0] + NEIGHBORHOOD_SIZE;
    i++
  ) {
    for (
      let j = newGrid[1] - NEIGHBORHOOD_SIZE;
      j <= newGrid[1] + NEIGHBORHOOD_SIZE;
      j++
    ) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j); // Call function to spawn a cache in this grid cell
      }
      newNeighborhood.add(`${i},${j}`);
    }
  }
}

function updateNeighborhood(center: leaflet.LatLng) {
  cleanupOldCaches(); //Wipe caches first
  // Define a new neighborhood area around the player
  const newGrid = computeGridBounds(center);

  // Define a new neighborhood area around the player
  spawnNeighborhoodCaches(newGrid);
}

function cleanupOldCaches() {
  map.eachLayer(function (layer: leaflet.layer) {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
}
