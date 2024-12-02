export class PlayerStorage {
  static getPlayerPosition() {
    const savedPosition = localStorage.getItem("playerPosition");
    console.log(JSON.parse(savedPosition));
    console.log({ lat: 37.793439, lng: -122.410296 });
    if (savedPosition) {
      return JSON.parse(savedPosition);
    } else {
      return { lat: 37.793439, lng: -122.410296 };
    }
  }

  static savePlayerPosition(lat: number, lng: number) {
    localStorage.setItem("playerPosition", JSON.stringify({ lat, lng }));
  }
}
