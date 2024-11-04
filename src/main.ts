// todo
import "./style.css";
const app = document.querySelector<HTMLDivElement>("#app")!;

const canvas = document.getElementById("canvas");
const _ctx = canvas?.getContext("2d");

const alertButton = document.createElement("button");
alertButton.innerHTML = "Click Me";
app.append(alertButton);

alertButton.onclick = () => {
  alert("You've clicked the button!");
};
