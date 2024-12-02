import leaflet from "leaflet";
export class PlayerStorage {
  static getPlayerPosition() {
    const savedPosition = localStorage.getItem("playerPosition");
    if (savedPosition) {
      return JSON.parse(savedPosition);
    } else {
      return leaflet.latLng(37.793439, -122.410296);
    }
  }

  static savePlayerPosition(lat: number, lng: number) {
    localStorage.setItem("playerPosition", JSON.stringify({ lat, lng }));
  }
}
