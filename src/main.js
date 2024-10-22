import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";

const data = [];
// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
const HEIGHT = 3000;
let primitive = null;
const worldTileset = await Cesium.createGooglePhotorealistic3DTileset();
viewer.scene.primitives.add(worldTileset);
const currentPrimitives = new Set();
const buildingTileset = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(buildingTileset);

const lon = 37.631099;
const lat = 55.753428;
const coordinateSystemPrimitives = [];
const center = Cesium.Cartesian3.fromDegrees(lon, lat, HEIGHT);
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
console.log("cente", center);
const drawArc = () => {
  drawSphere();
  clickHandler();
  // drawArrow()
  //createArc(center,1002,Cesium.Math.toRadians(0),Cesium.Math.toRadians(90.0),Cesium.Color.BLUEVIOLET)
};
const names = new Set(["X", "Y", "Z", "R", "SPHERE"]);

function drawSphere() {
  const radius = 100;
  const len = 120;
  // Создаем сферу
  const sphere = viewer.entities.add({
    position: center,
    properties: {
      name: "SPHERE",
    },
    ellipsoid: {
      radii: new Cesium.Cartesian3(radius, radius, radius),
      material: Cesium.Color.LIGHTBLUE.withAlpha(0.1), // Полупрозрачный синий цвет
    },
  });
  data.push(sphere);
  const getSurfaceNormal = () => {
    const surfaceNormal = new Cesium.Cartesian3();
    Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(center, surfaceNormal);
    return surfaceNormal;
  };
  //z
  const surfaceNormal = getSurfaceNormal();
  const zAxisDirection = Cesium.Cartesian3.multiplyByScalar(
    surfaceNormal,
    len,
    new Cesium.Cartesian3(),
  );

  //x
  const arbitrarVector = Cesium.Cartesian3.UNIT_X;
  const xAxisDirection = Cesium.Cartesian3.cross(
    arbitrarVector,
    zAxisDirection,
    new Cesium.Cartesian3(),
  );
  Cesium.Cartesian3.normalize(xAxisDirection, xAxisDirection);
  Cesium.Cartesian3.multiplyByScalar(xAxisDirection, -len, xAxisDirection);

  //y
  const yAxisDirection = Cesium.Cartesian3.cross(
    zAxisDirection,
    xAxisDirection,
    new Cesium.Cartesian3(),
  );
  Cesium.Cartesian3.normalize(yAxisDirection, yAxisDirection);
  Cesium.Cartesian3.multiplyByScalar(yAxisDirection, -len, yAxisDirection);

  //оси xyz
  function normalizeVector(vector) {
    const magnitude = Cesium.Cartesian3.magnitude(vector);
    if (magnitude === 0) {
      //const config = {
      //   type: 'error',
      //  message: 'Не удается нормализовать вектор нулевой длины',
      //  duration: 7000,
      //};
      // this.snackbarService.open(config);
      //return;
    }
    return Cesium.Cartesian3.normalize(vector, new Cesium.Cartesian3());
  }
  function addAxis(position, axisVector, color, name) {
    const normalizedAxis = normalizeVector(axisVector); // Нормализация с проверкой
    const offset = Cesium.Cartesian3.multiplyByScalar(
      normalizedAxis,
      len / 10,
      new Cesium.Cartesian3(),
    );
    const startPoint = Cesium.Cartesian3.add(
      position,
      offset,
      new Cesium.Cartesian3(),
    );
    // Добавление линии оси
    const line = viewer.entities.add({
      polyline: {
        name,
        positions: [
          startPoint,
          Cesium.Cartesian3.add(position, axisVector, new Cesium.Cartesian3()),
        ],
        width: 10.0,
        material: Cesium.Color[color],
        clampToGround: false,
      },
      properties: {
        axis: axisVector,
        name,
        movement: true, // Флаг для перемещения
      },
    });
    // this.addRotationPlane(position, normalizedAxis);
    return line;
  }

  const xAxis = addAxis(center, xAxisDirection, "RED", "X");
  const yAxis = addAxis(center, yAxisDirection, "GREEN", "Y");
  const zAxis = addAxis(center, zAxisDirection, "PINK", "Z");
  data.push(zAxis);
  //полукруг
  const halfCircle = viewer.entities.add({
    name: "R",
    position: center,
    ellipsoid: {
      // radii: center,
      radii: new Cesium.Cartesian3(radius, radius, radius),
      innerRadii: new Cesium.Cartesian3(radius - 30, radius - 30, radius - 30),
      minimumCone: Cesium.Math.toRadians(89.0),
      maximumCone: Cesium.Math.toRadians(91.0),
      minimumClock: Cesium.Math.toRadians(0.0),
      maximumClock: Cesium.Math.toRadians(-180.0),
      material: Cesium.Color.DARKBLUE,
      outline: false,
    },
  });
  data.push(halfCircle);
  viewer.zoomTo(viewer.entities);
  // Создаем круг как полигон
}

const button = document.getElementById("draw");
button.addEventListener("click", drawArc);
let isDragging = false;

function cameraBlockBehavior(isNormalBehavior) {
  viewer.scene.screenSpaceCameraController.enableRotate = isNormalBehavior;
  viewer.scene.screenSpaceCameraController.enableTranslate = isNormalBehavior;
  viewer.scene.screenSpaceCameraController.enableZoom = isNormalBehavior;
}
function listenMoveStop(click) {
  console.log("Мышь ОТЖАТА");
  isDragging = false;
  handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
  clickHandler();
  cameraBlockBehavior(true);
  // Здесь ваш код, который будет выполняться при нажатии на левую кнопку мыши
}
let t = false;

function listenMouseMove(click) {
  const inverse = viewer.camera.inverseViewMatrix;
  if (click.startPosition.y === click.endPosition.y) return;

  const cartesianStart = Cesium.Matrix4.multiplyByPoint(
    inverse,
    new Cesium.Cartesian3(click.startPosition.x, -click.startPosition.y, 0), //у экрана У направлена вниз поэтому -
    new Cesium.Cartesian3(),
  );

  // Преобразуем декартовы координаты в геодезические
  const cartographicStart = Cesium.Cartographic.fromCartesian(cartesianStart);
  //const longitudeStart = Cesium.Math.toDegrees(cartographicStart.longitude); //*(direction==='up'?-1:1);
  //const latitudeStart = Cesium.Math.toDegrees(cartographicStart.latitude);

  const cartesian = Cesium.Matrix4.multiplyByPoint(
    inverse,
    new Cesium.Cartesian3(click.endPosition.x, -click.endPosition.y, 0),
    new Cesium.Cartesian3(),
  );
  // Преобразуем декартовы координаты в геодезические
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  //const longitude = Cesium.Math.toDegrees(cartographic.longitude); //*(direction==='up'?-1:1);
  //const latitude = Cesium.Math.toDegrees(cartographic.latitude);

  const sub = Cesium.Cartesian3.subtract(
    cartesian,
    cartesianStart,
    new Cesium.Cartesian3(),
  );
  const axisVector = primitive.id?.properties.axis.getValue();
  //const magnitude = Cesium.Cartesian3.magnitude(sub);
  const axisvectorMagnitude = Cesium.Cartesian3.magnitude(axisVector);
  const name = primitive.id?.properties.name.getValue();
  let dot = Cesium.Cartesian3.dot(sub, axisVector);

  dot /= axisvectorMagnitude * axisvectorMagnitude; //высчитываем коэф шага движения !!!!

  const translation = Cesium.Cartesian3.multiplyByScalar(
    axisVector,
    dot,
    new Cesium.Cartesian3(),
  );
  primitive.primitive.modelMatrix.ge;

  const translateOld = Cesium.Matrix4.getTranslation(
    primitive.primitive.modelMatrix,
    new Cesium.Cartesian3(),
  );

  const hh = Cesium.Matrix4.fromTranslation(
    Cesium.Cartesian3.add(translation, translateOld, new Cesium.Cartesian3()),
  );

  const newModelMatrix = Cesium.Matrix4.multiply(
    primitive.primitive.modelMatrix,
    hh,
    new Cesium.Matrix4(),
  );

  primitive.primitive.modelMatrix = hh; //newModelMatrix;
  if (isDragging) {
    cameraBlockBehavior(false);
  }
  handler.setInputAction(listenMoveStop, Cesium.ScreenSpaceEventType.LEFT_UP);
}

function debounce(func, wait) {
  let timeout;
  if (isDragging) {
    // cameraBlockBehavior(false);
  }
  return function () {
    const context = this;

    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      //isDragging = false;
      func.apply(context, args);
    }, wait);
  };
}
const debouncedMouseMove = debounce(listenMouseMove, 50); // Вызываем функцию каждые 100 мс

function listenMouseDown(click) {
  console.log("down listen");
  viewer.scene
    .drillPick(click.position)
    .forEach((el) => console.log(el.id?.properties?.name.toString(), "__"));
  const t = viewer.scene
    .drillPick(click.position)
    .find(
      (el) =>
        el.id?.properties?.name.toString() === "Z" ||
        el.id?.properties?.name.toString() === "Y" ||
        el.id?.properties?.name.toString() === "X",
    );
  if (t) {
    primitive = t;
  } else {
    cameraBlockBehavior(true);
    return;
  }
  isDragging = true;
  handler.setInputAction(
    listenMouseMove,
    //debouncedMouseMove,
    Cesium.ScreenSpaceEventType.MOUSE_MOVE,
  );
}
function clickHandler() {
  handler.setInputAction(
    listenMouseDown,
    Cesium.ScreenSpaceEventType.LEFT_DOWN,
  );
}
