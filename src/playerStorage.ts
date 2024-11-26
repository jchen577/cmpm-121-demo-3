export class PlayerStorage {
  static getPlayerPosition() {
    const savedPosition = localStorage.getItem("playerPosition");
    if (savedPosition) {
      return JSON.parse(savedPosition);
    }
    return null;
  }

  static savePlayerPosition(lat: number, lng: number) {
    localStorage.setItem("playerPosition", JSON.stringify({ lat, lng }));
  }
}
